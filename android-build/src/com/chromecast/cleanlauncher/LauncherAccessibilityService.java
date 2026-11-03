package com.chromecast.cleanlauncher;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.util.Log;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;

/**
 * Ultra-lightweight Accessibility Service modeled after Projectivy Launcher and Button Mapper.
 * Intercepts the remote Home button and Google TV stock launcher window state changes
 * without performing heavy view hierarchy inspections or IPC calls that cause TV ANRs/reboots.
 */
public class LauncherAccessibilityService extends AccessibilityService {
    private static final String TAG = "CleanLauncherA11y";
    public static volatile boolean isRunning = false;

    // Known stock TV launchers to intercept
    private static final String GOOGLE_TV_LAUNCHER = "com.google.android.apps.tv.launcherx";
    private static final String ANDROID_TV_LAUNCHER = "com.google.android.tvlauncher";
    private static final String FIRE_TV_LAUNCHER = "com.amazon.firetv.launcher";

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        isRunning = true;
        Log.i(TAG, "LauncherAccessibilityService connected successfully.");

        try {
            AccessibilityServiceInfo info = new AccessibilityServiceInfo();
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.flags = AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
            info.notificationTimeout = 50;
            setServiceInfo(info);
        } catch (Exception e) {
            Log.e(TAG, "Failed to configure AccessibilityServiceInfo", e);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        Log.i(TAG, "LauncherAccessibilityService destroyed.");
    }

    @Override
    public boolean onUnbind(Intent intent) {
        isRunning = false;
        return super.onUnbind(intent);
    }

    @Override
    protected boolean onKeyEvent(KeyEvent event) {
        if (event == null) return false;

        // Intercept remote HOME button directly before Google TV receives it
        if (event.getKeyCode() == KeyEvent.KEYCODE_HOME) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                Log.d(TAG, "Captured remote HOME button via Accessibility Service");
                bringLauncherToFront();
            }
            return true; // Consume event completely so stock launcher never triggers
        }

        // All other keys (Back, DPAD, Select, Volume, Power) pass through completely untouched
        return super.onKeyEvent(event);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        // Only react when the stock launcher's actual HOME screen takes the foreground. The stock launcher
        // process also draws system dialogs and panels (network / Wi-Fi messages, notifications, volume,
        // input pickers); yanking Clean Launcher to the front for those kicked the user out of the app
        // they were watching, so those windows must be left alone.
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            CharSequence packageName = event.getPackageName();
            if (packageName != null) {
                String pkg = packageName.toString();
                if (GOOGLE_TV_LAUNCHER.equals(pkg) ||
                    ANDROID_TV_LAUNCHER.equals(pkg) ||
                    FIRE_TV_LAUNCHER.equals(pkg)) {
                    CharSequence cls = event.getClassName();
                    String name = cls != null ? cls.toString() : "";
                    Log.d(TAG, "Stock launcher window: " + pkg + " / " + name);
                    if (isStockHomeScreen(name)) {
                        Log.d(TAG, "Stock TV home screen detected, redirecting to Clean Launcher");
                        bringLauncherToFront();
                    }
                }
            }
        }
    }

    /** True only for the stock launcher's home activity, not for dialogs, panels or overlays. */
    private static boolean isStockHomeScreen(String className) {
        if (className.isEmpty()) return false;
        // Dialogs and overlays report framework classes (android.app.Dialog, android.widget.FrameLayout, ...)
        if (className.startsWith("android.") || className.startsWith("androidx.")) return false;
        return className.endsWith("HomeActivity")
            || className.endsWith("HomeScreenActivity")
            || className.endsWith("TvHomeActivity")
            || className.equals("com.google.android.tvlauncher.MainActivity")
            || className.equals("com.amazon.firetv.launcher.MainActivity");
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }

    /**
     * Instantly brings Clean Launcher to the foreground without animation lag.
     */
    private void bringLauncherToFront() {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            );
            intent.putExtra("is_home_press", true);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error bringing Clean Launcher to front", e);
        }
    }
}
