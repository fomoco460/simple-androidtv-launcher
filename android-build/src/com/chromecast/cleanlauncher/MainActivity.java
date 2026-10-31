package com.chromecast.cleanlauncher;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.content.res.Configuration;
import android.util.DisplayMetrics;
import android.util.Base64;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private static final String TAG = "CleanLauncherTV";
    private WebView webView;
    private LocalAssetServer localServer;
    private static final int DEFAULT_PORT = 8989;
    private static final long APP_SCAN_TTL_MS = 60_000L;
    private int serverPort = DEFAULT_PORT;

    // Installed-app scan cache (rebuilt at most once per TTL, or immediately after a package change)
    private final Object appScanLock = new Object();
    private String cachedAppsJson = null;
    private long cachedAppsAt = 0L;
    private final Map<String, String> iconCache = new HashMap<>();
    private BroadcastReceiver packageReceiver;

    public class AndroidBridge {
        private Context mContext;

        public AndroidBridge(Context context) {
            mContext = context;
        }

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        @JavascriptInterface
        public boolean is24HourFormat() {
            try {
                return android.text.format.DateFormat.is24HourFormat(mContext);
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean launchPackage(String packageName) {
            return launchApp("", packageName);
        }

        @JavascriptInterface
        public boolean launchApp(String appName, String packageName) {
            PackageManager pm = mContext.getPackageManager();
            List<String> candidates = new ArrayList<>();

            if (packageName != null && !packageName.trim().isEmpty()) {
                String[] parts = packageName.trim().split("[,;|\\s]+");
                for (String p : parts) {
                    if (!p.isEmpty()) candidates.add(p);
                }
            }

            // Populate known alternate packages for popular TV apps
            String checkName = (appName != null ? appName.toLowerCase() : "") + " " +
                               (packageName != null ? packageName.toLowerCase() : "");

            if (checkName.contains("smarttube") || checkName.contains("videomanager") || checkName.contains("teamsmart")) {
                candidates.add("com.teamsmart.videomanager.tv");
                candidates.add("com.liskovsoft.smarttubetv.beta");
                candidates.add("com.liskovsoft.smarttubetv");
                candidates.add("com.liskovsoft.videomanager");
            }
            if (checkName.contains("youtube")) {
                candidates.add("com.google.android.youtube.tv");
                candidates.add("com.google.android.youtube");
            }
            if (checkName.contains("netflix")) {
                candidates.add("com.netflix.ninja");
                candidates.add("com.netflix.mediaclient");
            }
            if (checkName.contains("prime") || checkName.contains("amazon")) {
                candidates.add("com.amazon.amazonvideo.livingroom");
                candidates.add("com.amazon.avod.thirdpartyclient");
            }
            if (checkName.contains("disney")) {
                candidates.add("com.disney.disneyplus");
            }
            if (checkName.contains("max") || checkName.contains("hbo")) {
                candidates.add("com.wbd.stream");
                candidates.add("com.hbo.hbonow");
                candidates.add("com.hbo.max");
            }
            if (checkName.contains("apple")) {
                candidates.add("com.apple.atve.sony.appletv");
                candidates.add("com.apple.atve.amazon.appletv");
                candidates.add("com.apple.atve.androidtv.appletv");
            }
            if (checkName.contains("kodi")) {
                candidates.add("org.xbmc.kodi");
                candidates.add("org.xbmc.kodi.tv");
            }
            if (checkName.contains("spotify")) {
                candidates.add("com.spotify.tv.android");
                candidates.add("com.spotify.music");
            }
            if (checkName.contains("plex")) {
                candidates.add("com.plexapp.android");
            }
            if (checkName.contains("hulu")) {
                candidates.add("com.hulu.livingroomplus");
                candidates.add("com.hulu.plus");
            }
            if (checkName.contains("twitch")) {
                candidates.add("tv.twitch.android.app");
            }
            if (checkName.contains("tubi")) {
                candidates.add("com.tubitv");
            }
            if (checkName.contains("vlc")) {
                candidates.add("org.videolan.vlc");
            }
            if (checkName.contains("xfinity") || checkName.contains("comcast") || checkName.contains("stream")) {
                candidates.add("com.xfinity.cloudtvr");
                candidates.add("com.xfinity.cloudtvr.tv");
                candidates.add("com.xfinity.stream.tv");
                candidates.add("com.comcast.cvs.android.tv");
                candidates.add("com.xfinity.tv");
            }

            // 1. Try launching direct candidates
            for (String candidate : candidates) {
                if (tryLaunchPackage(pm, candidate)) {
                    Log.i(TAG, "Launched app successfully with package: " + candidate);
                    return true;
                }
            }

            // 2. Search installed applications by package keyword or app name
            try {
                Intent queryIntent = new Intent(Intent.ACTION_MAIN, null);
                queryIntent.addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
                List<ResolveInfo> installed = pm.queryIntentActivities(queryIntent, 0);

                if (installed == null || installed.isEmpty()) {
                    queryIntent = new Intent(Intent.ACTION_MAIN, null);
                    queryIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                    installed = pm.queryIntentActivities(queryIntent, 0);
                }

                if (installed != null) {
                    String cleanName = appName != null ? appName.trim().toLowerCase() : "";
                    String cleanPkg = packageName != null ? packageName.trim().toLowerCase() : "";

                    for (ResolveInfo info : installed) {
                        String p = info.activityInfo.packageName;
                        String label = info.loadLabel(pm).toString().trim().toLowerCase();

                        boolean match = false;
                        if (!cleanName.isEmpty() && (label.equalsIgnoreCase(cleanName) || label.contains(cleanName) || cleanName.contains(label))) {
                            match = true;
                        }
                        if (!cleanPkg.isEmpty() && p.toLowerCase().contains(cleanPkg)) {
                            match = true;
                        }

                        if (match) {
                            if (tryLaunchPackage(pm, p)) {
                                Log.i(TAG, "Matched and launched installed app: " + label + " (" + p + ")");
                                return true;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Error searching installed apps for " + appName, e);
            }

            Log.w(TAG, "Could not find or launch app: " + appName + " (" + packageName + ")");
            // DO NOT fallback to market://details?id= which opens Google Play Store with "Item not found"
            return false;
        }

        private boolean tryLaunchPackage(PackageManager pm, String pkg) {
            if (pkg == null || pkg.trim().isEmpty()) return false;
            String cleanPkg = pkg.trim();

            // First preference: Leanback TV launcher intent
            try {
                Intent leanbackIntent = pm.getLeanbackLaunchIntentForPackage(cleanPkg);
                if (leanbackIntent != null) {
                    leanbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                    mContext.startActivity(leanbackIntent);
                    return true;
                }
            } catch (Exception ignored) {}

            // Second preference: Standard launch intent
            try {
                Intent launchIntent = pm.getLaunchIntentForPackage(cleanPkg);
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                    mContext.startActivity(launchIntent);
                    return true;
                }
            } catch (Exception ignored) {}

            // Third preference: Any MAIN activity (critical for sideloaded mobile/Fire TV APKs like Xfinity Stream)
            try {
                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.setPackage(cleanPkg);
                List<ResolveInfo> activities = pm.queryIntentActivities(mainIntent, 0);
                if (activities != null && !activities.isEmpty()) {
                    ResolveInfo info = activities.get(0);
                    Intent intent = new Intent(Intent.ACTION_MAIN);
                    intent.setClassName(info.activityInfo.packageName, info.activityInfo.name);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                    mContext.startActivity(intent);
                    return true;
                }
            } catch (Exception ignored) {}

            return false;
        }

        @JavascriptInterface
        public boolean launchIntent(String intentUri) {
            if (intentUri == null || intentUri.trim().isEmpty()) return false;
            String uri = intentUri.trim();
            if (!uri.startsWith("intent:")) {
                Log.w(TAG, "launchIntent refused (not an intent: URI)");
                return false;
            }
            try {
                Intent intent = Intent.parseUri(uri, Intent.URI_INTENT_SCHEME);

                // Never let a URI aim at this app or carry a selector / extra flags
                intent.setSelector(null);
                String ownPkg = mContext.getPackageName();
                String targetPkg = intent.getPackage();
                if (targetPkg == null && intent.getComponent() != null) {
                    targetPkg = intent.getComponent().getPackageName();
                }
                if (ownPkg.equals(targetPkg)) {
                    Log.w(TAG, "launchIntent refused (targets this app)");
                    return false;
                }

                // Require an explicit target app, or a system settings screen
                String action = intent.getAction();
                boolean isSettingsAction = action != null && action.startsWith("android.settings.");
                if (targetPkg == null && !isSettingsAction) {
                    Log.w(TAG, "launchIntent refused (no package/component)");
                    return false;
                }

                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mContext.startActivity(intent);
                return true;
            } catch (Exception e) {
                Log.w(TAG, "Failed to launch intentUri: " + uri, e);
            }
            return false;
        }

        @JavascriptInterface
        public void openAndroidSettings() {
            openSettings(null);
        }

        @JavascriptInterface
        public void openSettings(String action) {
            try {
                Intent intent;
                if (action != null && action.trim().startsWith("android.settings.")) {
                    intent = new Intent(action.trim());
                } else {
                    if (action != null && !action.trim().isEmpty()) {
                        Log.w(TAG, "openSettings refused action: " + action);
                    }
                    intent = new Intent(android.provider.Settings.ACTION_SETTINGS);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mContext.startActivity(intent);
            } catch (Exception e) {
                try {
                    Intent fallbackIntent = new Intent(android.provider.Settings.ACTION_SETTINGS);
                    fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    mContext.startActivity(fallbackIntent);
                } catch (Exception ex) {
                    Log.w(TAG, "Could not open Android Settings", ex);
                }
            }
        }

        @JavascriptInterface
        public boolean isAccessibilityServiceEnabled() {
            if (LauncherAccessibilityService.isRunning) {
                return true;
            }
            try {
                String enabledServices = android.provider.Settings.Secure.getString(
                    mContext.getContentResolver(),
                    android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                );
                if (enabledServices != null) {
                    return enabledServices.contains("LauncherAccessibilityService") ||
                           enabledServices.contains(mContext.getPackageName() + "/");
                }
            } catch (Exception ignored) {}
            return false;
        }

        @JavascriptInterface
        public boolean isAccessibilityRunning() {
            return LauncherAccessibilityService.isRunning || isAccessibilityServiceEnabled();
        }

        @JavascriptInterface
        public boolean restoreAccessibilityService() {
            if (LauncherAccessibilityService.isRunning) return true;

            // Writing secure settings needs a one-time grant:
            //   adb shell pm grant com.chromecast.cleanlauncher android.permission.WRITE_SECURE_SETTINGS
            if (mContext.checkCallingOrSelfPermission("android.permission.WRITE_SECURE_SETTINGS")
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "restoreAccessibilityService: WRITE_SECURE_SETTINGS not granted");
                return false;
            }
            try {
                String serviceName = mContext.getPackageName() + "/" + LauncherAccessibilityService.class.getName();
                String enabled = android.provider.Settings.Secure.getString(
                    mContext.getContentResolver(),
                    android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                );
                if (enabled == null || !enabled.contains(serviceName)) {
                    String newEnabled = (enabled == null || enabled.isEmpty()) ? serviceName : (enabled + ":" + serviceName);
                    android.provider.Settings.Secure.putString(
                        mContext.getContentResolver(),
                        android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
                        newEnabled
                    );
                    android.provider.Settings.Secure.putString(
                        mContext.getContentResolver(),
                        android.provider.Settings.Secure.ACCESSIBILITY_ENABLED,
                        "1"
                    );
                }
                return true;
            } catch (SecurityException e) {
                Log.w(TAG, "restoreAccessibilityService failed", e);
                return false;
            }
        }

        @JavascriptInterface
        public void openAccessibilitySettings() {
            try {
                Intent tvIntent = new Intent("android.settings.ACCESSIBILITY_SETTINGS");
                tvIntent.setPackage("com.android.tv.settings");
                tvIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mContext.startActivity(tvIntent);
                return;
            } catch (Exception ignored) {}

            try {
                Intent intent = new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mContext.startActivity(intent);
            } catch (Exception e) {
                openAndroidSettings();
            }
        }

        @JavascriptInterface
        public void openAppDetails() {
            try {
                Intent tvIntent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                tvIntent.setData(Uri.parse("package:" + mContext.getPackageName()));
                tvIntent.setPackage("com.android.tv.settings");
                tvIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mContext.startActivity(tvIntent);
                return;
            } catch (Exception ignored) {}

            try {
                Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + mContext.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mContext.startActivity(intent);
            } catch (Exception e) {
                Log.w(TAG, "Could not open app details: " + e.getMessage());
                openAndroidSettings();
            }
        }

        private String getBase64AppIcon(PackageManager pm, ResolveInfo info) {
            try {
                Drawable drawable = info.loadIcon(pm);
                if (drawable == null && info.activityInfo != null) {
                    drawable = info.activityInfo.loadIcon(pm);
                }
                return drawableToDataUri(drawable);
            } catch (Throwable ignored) {}
            return null;
        }

        private String getBase64AppIcon(PackageManager pm, ApplicationInfo appInfo) {
            try {
                if (appInfo == null) return null;
                return drawableToDataUri(appInfo.loadIcon(pm));
            } catch (Throwable ignored) {}
            return null;
        }

        /** Renders any Drawable to a 96x96 PNG data URI (single shared implementation). */
        private String drawableToDataUri(Drawable drawable) {
            if (drawable == null) return null;
            Bitmap bitmap;
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
            } else {
                int w = Math.max(1, drawable.getIntrinsicWidth());
                int h = Math.max(1, drawable.getIntrinsicHeight());
                bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
            }
            if (bitmap == null) return null;
            Bitmap scaled = Bitmap.createScaledBitmap(bitmap, 96, 96, true);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            scaled.compress(Bitmap.CompressFormat.PNG, 90, baos);
            return "data:image/png;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
        }

        /** Icon lookup with an in-memory cache keyed by package name. */
        private String cachedIcon(String pkg, PackageManager pm, ResolveInfo info, ApplicationInfo appInfo) {
            synchronized (appScanLock) {
                String hit = iconCache.get(pkg);
                if (hit != null) return hit.isEmpty() ? null : hit;
            }
            String icon = info != null ? getBase64AppIcon(pm, info) : getBase64AppIcon(pm, appInfo);
            synchronized (appScanLock) {
                iconCache.put(pkg, icon == null ? "" : icon);
            }
            return icon;
        }

        @JavascriptInterface
        public String getInstalledTvApps() {
            synchronized (appScanLock) {
                long now = System.currentTimeMillis();
                if (cachedAppsJson != null && (now - cachedAppsAt) < APP_SCAN_TTL_MS) {
                    return cachedAppsJson;
                }
                String fresh = scanInstalledTvApps();
                cachedAppsJson = fresh;
                cachedAppsAt = System.currentTimeMillis();
                return fresh;
            }
        }

        private String scanInstalledTvApps() {
            try {
                PackageManager pm = mContext.getPackageManager();
                Set<String> seenPackages = new HashSet<>();
                JSONArray array = new JSONArray();

                // 1. Query Leanback TV Apps
                Intent leanbackIntent = new Intent(Intent.ACTION_MAIN, null);
                leanbackIntent.addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
                List<ResolveInfo> leanbackApps = pm.queryIntentActivities(leanbackIntent, 0);

                if (leanbackApps != null) {
                    for (ResolveInfo info : leanbackApps) {
                        String pkg = info.activityInfo.packageName;
                        if (pkg.equals(mContext.getPackageName()) || seenPackages.contains(pkg)) {
                            continue;
                        }
                        seenPackages.add(pkg);
                        JSONObject obj = new JSONObject();
                        obj.put("name", info.loadLabel(pm).toString());
                        obj.put("package", pkg);
                        String icon = cachedIcon(pkg, pm, info, null);
                        if (icon != null) {
                            obj.put("icon", icon);
                        }
                        array.put(obj);
                    }
                }

                // 2. Query Standard Launcher Apps (for sideloaded TV apps that lack leanback banner)
                Intent standardIntent = new Intent(Intent.ACTION_MAIN, null);
                standardIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> standardApps = pm.queryIntentActivities(standardIntent, 0);

                if (standardApps != null) {
                    for (ResolveInfo info : standardApps) {
                        String pkg = info.activityInfo.packageName;
                        if (pkg.equals(mContext.getPackageName()) || seenPackages.contains(pkg)) {
                            continue;
                        }
                        seenPackages.add(pkg);
                        JSONObject obj = new JSONObject();
                        obj.put("name", info.loadLabel(pm).toString());
                        obj.put("package", pkg);
                        String icon = cachedIcon(pkg, pm, info, null);
                        if (icon != null) {
                            obj.put("icon", icon);
                        }
                        array.put(obj);
                    }
                }

                // 3. Query all installed packages to discover any sideloaded application (e.g. Xfinity Stream)
                try {
                    List<android.content.pm.PackageInfo> allPackages = pm.getInstalledPackages(0);
                    if (allPackages != null) {
                        for (android.content.pm.PackageInfo pi : allPackages) {
                            String pkg = pi.packageName;
                            if (pkg == null || pkg.equals(mContext.getPackageName()) || seenPackages.contains(pkg)) {
                                continue;
                            }

                            // Sideloaded / user-installed apps have FLAG_SYSTEM = 0
                            boolean isUserApp = (pi.applicationInfo != null) &&
                                ((pi.applicationInfo.flags & android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0);

                            Intent launchIntent = pm.getLeanbackLaunchIntentForPackage(pkg);
                            if (launchIntent == null) {
                                launchIntent = pm.getLaunchIntentForPackage(pkg);
                            }
                            if (launchIntent == null) {
                                Intent mainTest = new Intent(Intent.ACTION_MAIN, null);
                                mainTest.setPackage(pkg);
                                List<ResolveInfo> rList = pm.queryIntentActivities(mainTest, 0);
                                if (rList != null && !rList.isEmpty()) {
                                    launchIntent = mainTest;
                                }
                            }

                            // If launchable or is a user-installed sideloaded app, add it!
                            if (launchIntent != null || isUserApp) {
                                seenPackages.add(pkg);
                                JSONObject obj = new JSONObject();
                                String label = pi.applicationInfo != null ? pi.applicationInfo.loadLabel(pm).toString() : pkg;
                                obj.put("name", label);
                                obj.put("package", pkg);
                                String icon = cachedIcon(pkg, pm, null, pi.applicationInfo);
                                if (icon != null) {
                                    obj.put("icon", icon);
                                }
                                array.put(obj);
                            }
                        }
                    }
                } catch (Exception ex) {
                    Log.w(TAG, "Error discovering sideloaded packages: " + ex.getMessage());
                }

                return array.toString();
            } catch (Exception e) {
                Log.e(TAG, "Error listing installed TV apps", e);
            }
            return "[]";
        }

        /** Used by the error screen: restart the asset server and reload the launcher. */
        @JavascriptInterface
        public void retryStart() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    stopLocalServer();
                    startLocalServer();
                    loadLauncher();
                }
            });
        }

        @JavascriptInterface
        public void reload() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (webView != null) {
                        webView.reload();
                    }
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // MUST be called before super.onCreate to prevent decor title bar
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setImmersiveMode();

        // Start internal HTTP asset server to eliminate any file:// CORS or module restrictions
        startLocalServer();

        // Remote WebView debugging only for debuggable builds
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT
                && (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();

        // Disable Android TV's system default yellow/amber focus ring highlight
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                WebView.class.getMethod("setDefaultFocusHighlightEnabled", boolean.class).invoke(webView, false);
            }
        } catch (Throwable ignored) {}

        // Hardware acceleration layer is required for HTML5 video playback in WebView
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setNeedInitialFocus(false);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // The JS bridge must only ever be exposed to our own bundled content.
                // (On API 24+ the WebResourceRequest overload delegates to this method.)
                if (isAllowedUrl(url)) return false;
                Log.w(TAG, "Blocked navigation to: " + url);
                return true;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // Never accept invalid certificates.
                Log.w(TAG, "SSL error, cancelling: " + error);
                handler.cancel();
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                Log.e(TAG, "WebView error " + errorCode + ": " + description + " for " + failingUrl);
                if (failingUrl != null && failingUrl.startsWith("http://127.0.0.1")) {
                    showErrorScreen(description, failingUrl);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    String failingUrl = request.getUrl() != null ? request.getUrl().toString() : "";
                    Log.e(TAG, "Main frame error on " + failingUrl);
                    showErrorScreen("Error loading: " + failingUrl, failingUrl);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d(TAG, "Page finished loading: " + url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public Bitmap getDefaultVideoPoster() {
                // Return 1x1 transparent bitmap so WebView never draws the default gray circle play icon
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG + "_JS", consoleMessage.message() + " (line " + consoleMessage.lineNumber() + " of " + consoleMessage.sourceId() + ")");
                return true;
            }
        });

        setContentView(webView);

        registerPackageReceiver();
        loadLauncher();
    }

    /** Only our own local asset server (and about:blank) may be shown in the bridged WebView. */
    private boolean isAllowedUrl(String url) {
        if (url == null) return false;
        return url.equals("about:blank")
            || url.equals("http://127.0.0.1:" + serverPort)
            || url.startsWith("http://127.0.0.1:" + serverPort + "/");
    }

    private void loadLauncher() {
        if (localServer != null && localServer.isRunning()) {
            String url = "http://127.0.0.1:" + serverPort + "/index.html";
            Log.d(TAG, "Loading from local embedded server: " + url);
            webView.loadUrl(url);
        } else {
            showErrorScreen("The local asset server could not start (port " + serverPort
                + " may be in use). Press Retry, or restart the launcher.", "");
        }
    }

    private void showErrorScreen(String errorDesc, String failedUrl) {
        String safeError = errorDesc != null ? errorDesc.replace("<", "&lt;").replace(">", "&gt;") : "Unknown error";
        String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>"
            + "<style>body{background:#0a0e17;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;"
            + "align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center;box-sizing:border-box;}"
            + "h1{font-size:24px;margin-bottom:8px;color:#38bdf8;}p{color:#94a3b8;font-size:16px;max-width:600px;line-height:1.5;}"
            + ".box{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px 24px;margin:20px 0;font-family:monospace;font-size:13px;color:#f87171;}"
            + "button{background:#0284c7;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:600;}"
            + "button:focus,button:hover{background:#38bdf8;outline:2px solid #fff;}"
            + "</style></head><body>"
            + "<h1>Clean Launcher</h1>"
            + "<p>Unable to load the launcher interface locally. Please check below or retry:</p>"
            + "<div class='box'>" + safeError + "</div>"
            + "<button autofocus onclick='AndroidBridge.retryStart()'>Retry Loading</button>"
            + "</body></html>";

        webView.loadDataWithBaseURL("http://127.0.0.1:" + serverPort + "/", html, "text/html", "UTF-8", null);
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    private void startLocalServer() {
        // Fixed port on purpose: localStorage is per-origin, so a different port would
        // silently hide the user's saved settings. Retry briefly if the port is still
        // held by a previous instance, then give up and show the error screen.
        serverPort = DEFAULT_PORT;
        for (int attempt = 1; attempt <= 8; attempt++) {
            try {
                localServer = new LocalAssetServer(serverPort);
                localServer.start();
                Log.i(TAG, "LocalAssetServer started on port " + serverPort + " (attempt " + attempt + ")");
                return;
            } catch (Exception e) {
                Log.w(TAG, "LocalAssetServer bind failed on " + serverPort + " (attempt " + attempt + ")", e);
                localServer = null;
                try { Thread.sleep(250); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
            }
        }
        Log.e(TAG, "Could not start local asset server on port " + serverPort);
    }

    /** Invalidate the app-scan cache and tell the web UI when apps are installed/removed. */
    private void registerPackageReceiver() {
        packageReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                synchronized (appScanLock) {
                    cachedAppsJson = null;
                    cachedAppsAt = 0L;
                    iconCache.clear();
                }
                if (webView != null) {
                    webView.post(new Runnable() {
                        @Override
                        public void run() {
                            if (webView != null) {
                                webView.evaluateJavascript(
                                    "window.dispatchEvent(new CustomEvent('chromecast-packages-changed'));", null);
                            }
                        }
                    });
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_PACKAGE_ADDED);
        filter.addAction(Intent.ACTION_PACKAGE_REMOVED);
        filter.addAction(Intent.ACTION_PACKAGE_REPLACED);
        filter.addDataScheme("package");
        registerReceiver(packageReceiver, filter);
    }

    private void stopLocalServer() {
        if (localServer != null) {
            localServer.stopServer();
            localServer = null;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        setImmersiveMode();

        // ONLY trigger home press event if the user physically pressed Home or an explicit Home intent arrived.
        // Never reset to home dock when returning from settings, toggling options, or waking from sleep.
        boolean isExplicitHome = intent != null && (
            intent.getBooleanExtra("is_home_press", false) ||
            intent.hasCategory(Intent.CATEGORY_HOME)
        );

        if (isExplicitHome && webView != null) {
            webView.evaluateJavascript(
                "(function() { " +
                "window.dispatchEvent(new CustomEvent('chromecast-home-press')); " +
                "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', keyCode: 72, bubbles: true })); " +
                "})();",
                null
            );
            webView.requestFocus();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        setImmersiveMode();
        if (webView != null) {
            webView.onResume();
            webView.requestFocus();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopLocalServer();
        if (packageReceiver != null) {
            try { unregisterReceiver(packageReceiver); } catch (Exception ignored) {}
            packageReceiver = null;
        }
        if (webView != null) {
            webView.destroy();
        }
    }

    private void setImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();
        int action = event.getAction();

        // 1. Intercept hardware HOME button so Clean Launcher stays active and resets to home dock
        if (keyCode == KeyEvent.KEYCODE_HOME) {
            if (action == KeyEvent.ACTION_DOWN) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (webView != null) {
                            webView.evaluateJavascript(
                                "(function() { " +
                                "window.dispatchEvent(new CustomEvent('chromecast-home-press')); " +
                                "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', keyCode: 72, bubbles: true })); " +
                                "})();",
                                null
                            );
                        }
                    }
                });
            }
            return true;
        }

        // 2. Intercept hardware BACK button so Clean Launcher cleanly closes modals or returns to home dock
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (action == KeyEvent.ACTION_DOWN) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (webView != null) {
                            webView.evaluateJavascript(
                                "(function() { " +
                                "window.dispatchEvent(new CustomEvent('chromecast-back-press')); " +
                                "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); " +
                                "})();",
                                null
                            );
                        }
                    }
                });
            }
            return true;
        }

        // 3. Handle D-pad and action keys
        if (action == KeyEvent.ACTION_DOWN) {
            String jsKey = null;
            String jsCode = null;
            int jsKeyCode = 0;

            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_UP:
                    jsKey = "ArrowUp";
                    jsCode = "ArrowUp";
                    jsKeyCode = 38;
                    break;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    jsKey = "ArrowDown";
                    jsCode = "ArrowDown";
                    jsKeyCode = 40;
                    break;
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    jsKey = "ArrowLeft";
                    jsCode = "ArrowLeft";
                    jsKeyCode = 37;
                    break;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    jsKey = "ArrowRight";
                    jsCode = "ArrowRight";
                    jsKeyCode = 39;
                    break;
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_NUMPAD_ENTER:
                    jsKey = "Enter";
                    jsCode = "Enter";
                    jsKeyCode = 13;
                    break;
                case KeyEvent.KEYCODE_MENU:
                    jsKey = "m";
                    jsCode = "KeyM";
                    jsKeyCode = 77;
                    break;
            }

            if (jsKey != null && webView != null) {
                final String finalJsKey = jsKey;
                final String finalJsCode = jsCode;
                final int finalJsKeyCode = jsKeyCode;
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (webView == null) return;
                        String js = "(function() { " +
                            "var el = document.activeElement; " +
                            "var tag = el ? el.tagName : ''; " +
                            "if (tag === 'INPUT' || tag === 'TEXTAREA') { " +
                            "  if ('" + finalJsKey + "' !== 'ArrowUp' && '" + finalJsKey + "' !== 'ArrowDown') { return; } " +
                            "} " +
                            "var evt = new KeyboardEvent('keydown', { " +
                            "  key: '" + finalJsKey + "', " +
                            "  code: '" + finalJsCode + "', " +
                            "  keyCode: " + finalJsKeyCode + ", " +
                            "  which: " + finalJsKeyCode + ", " +
                            "  bubbles: true, " +
                            "  cancelable: true " +
                            "}); " +
                            "window.dispatchEvent(evt); " +
                            "})();";
                        webView.evaluateJavascript(js, null);
                    }
                });
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                "(function() { " +
                "window.dispatchEvent(new CustomEvent('chromecast-back-press')); " +
                "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); " +
                "})();",
                null
            );
        }
    }

    /**
     * Ultra-lightweight local HTTP server running on 127.0.0.1.
     * Serves bundled assets from Android AssetManager directly.
     * Provides valid HTTP origin, enabling ES6 modules, localStorage, and IndexedDB without CORS issues.
     */
    private class LocalAssetServer extends Thread {
        private int mPort;
        private ServerSocket mServerSocket;
        private volatile boolean mRunning = true;

        public LocalAssetServer(int port) throws Exception {
            super("LocalAssetServerThread");
            mPort = port;
            mServerSocket = new ServerSocket();
            mServerSocket.setReuseAddress(true);
            mServerSocket.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), mPort), 50);
            if (mPort == 0) {
                mPort = mServerSocket.getLocalPort();
            }
        }

        public int getPort() {
            return mPort;
        }

        public boolean isRunning() {
            return mRunning && mServerSocket != null && !mServerSocket.isClosed();
        }

        public void stopServer() {
            mRunning = false;
            try {
                if (mServerSocket != null) {
                    mServerSocket.close();
                }
            } catch (Exception ignored) {}
        }

        @Override
        public void run() {
            while (mRunning) {
                Socket socket = null;
                try {
                    socket = mServerSocket.accept();
                    handleClient(socket);
                } catch (Exception e) {
                    if (!mRunning) {
                        break;
                    }
                }
            }
        }

        private void handleClient(final Socket socket) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        InputStream in = socket.getInputStream();
                        OutputStream out = socket.getOutputStream();
                        BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));

                        String requestLine = reader.readLine();
                        if (requestLine == null || requestLine.isEmpty()) {
                            socket.close();
                            return;
                        }

                        String[] parts = requestLine.split(" ");
                        if (parts.length < 2) {
                            socket.close();
                            return;
                        }

                        String uriPath = parts[1];
                        // Strip query parameters
                        int qIdx = uriPath.indexOf('?');
                        if (qIdx != -1) {
                            uriPath = uriPath.substring(0, qIdx);
                        }
                        uriPath = URLDecoder.decode(uriPath, "UTF-8");

                        if (uriPath.startsWith("/")) {
                            uriPath = uriPath.substring(1);
                        }
                        if (uriPath.isEmpty()) {
                            uriPath = "index.html";
                        }

                        InputStream assetStream = null;
                        try {
                            assetStream = getAssets().open(uriPath);
                        } catch (Exception notFound) {
                            // Try in dist/ if not found
                            try {
                                assetStream = getAssets().open("dist/" + uriPath);
                            } catch (Exception e2) {
                                // Fallback to index.html for SPA routes if not an asset file
                                if (!uriPath.contains(".")) {
                                    try {
                                        assetStream = getAssets().open("index.html");
                                        uriPath = "index.html";
                                    } catch (Exception ignored) {}
                                }
                            }
                        }

                        if (assetStream != null) {
                            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                            byte[] chunk = new byte[8192];
                            int read;
                            while ((read = assetStream.read(chunk)) != -1) {
                                buffer.write(chunk, 0, read);
                            }
                            assetStream.close();
                            byte[] data = buffer.toByteArray();

                            String mime = getMimeType(uriPath);
                            String header = "HTTP/1.1 200 OK\r\n"
                                + "Content-Type: " + mime + "\r\n"
                                + "Content-Length: " + data.length + "\r\n"
                                + "Access-Control-Allow-Origin: *\r\n"
                                + "Access-Control-Allow-Methods: GET, OPTIONS\r\n"
                                + "Cache-Control: no-cache\r\n"
                                + "Connection: close\r\n\r\n";

                            out.write(header.getBytes(StandardCharsets.UTF_8));
                            out.write(data);
                            out.flush();
                        } else {
                            String notFoundResp = "HTTP/1.1 404 Not Found\r\n"
                                + "Content-Type: text/plain\r\n"
                                + "Content-Length: 9\r\n"
                                + "Connection: close\r\n\r\n"
                                + "Not Found";
                            out.write(notFoundResp.getBytes(StandardCharsets.UTF_8));
                            out.flush();
                        }
                    } catch (Exception ignored) {
                    } finally {
                        try {
                            socket.close();
                        } catch (Exception ignored) {}
                    }
                }
            }).start();
        }
    }
}
