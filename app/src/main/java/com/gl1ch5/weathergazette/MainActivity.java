package com.gl1ch5.weathergazette;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;


/**
 * ГАЗЕТА ПОГОДЫ — нативная обёртка WebView.
 * Всё содержимое приложения — в assets/www (офлайн-готовое).
 */
public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "file:///android_asset/www/index.html";
    private static final int REQ_GEO = 41;

    private WebView webView;
    private FrameLayout root;
    private ProgressBar bar;
    private long lastBackAt = 0;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private ConnectivityManager.NetworkCallback networkCallback;
    private int baseInsetTop = 0;
    private int baseInsetBottom = 0;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        // Не гасим экран, пока читают сводку
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        root = new FrameLayout(this);
        root.setBackgroundColor(0xFFF3EAD6);

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.setFitsSystemWindows(false);
        setContentView(root);

        // Контейнер с «печатным» фоном вокруг WebView, чтобы не было белых полос в тёмной теме
        applySystemBarColors(0xFFF3EAD6, false);
        setupInsets();
        setupWebView();
        setupNetworkWatcher();

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL);
        }
    }

    /* ------------------------------------------------------------------ WebView */

    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            s.setAlgorithmicDarkeningAllowed(false); // свою тему рисует само приложение
        }
        webView.setBackgroundColor(0xFFF3EAD6);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            webView.setForceDarkAllowed(false);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                if (!url.startsWith("file://")) showLoading(true);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                showLoading(false);
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (failingUrl != null && failingUrl.startsWith("file://")) {
                    showFatalOfflineView();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request.isForMainFrame()) {
                    // Основной фрейм локальный — обычно сюда попадаем только при битой сборке
                    showFatalOfflineView();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                                                           GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{Manifest.permission.ACCESS_COARSE_LOCATION,
                                    Manifest.permission.ACCESS_FINE_LOCATION}, REQ_GEO);
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                android.util.Log.d("WebGazette", msg.message() + " @" + msg.lineNumber());
                return true;
            }
        });

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
    }

    private boolean handleUrl(Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        if (scheme.equals("file") || scheme.equals("about")) return false;
        if (scheme.equals("http") || scheme.equals("https")) {
            // Внешние ссылки — в браузер
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) { }
            return true;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) { }
        return true;
    }

    /* ------------------------------------------------------- JS-мост */

    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    /** Возвращаемся в WebView после запроса разрешения */
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_GEO) {
            boolean granted = false;
            for (int r : grantResults) if (r == PackageManager.PERMISSION_GRANTED) granted = true;
            if (pendingGeoCallback != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
            if (!granted) {
                js("window.onNativeLocation && window.onNativeLocation(null, null, 'Разрешение на геолокацию не выдано');");
            }
        }
    }

    class Bridge {
        @JavascriptInterface
        public void ready() { }

        @JavascriptInterface
        public void vibrate(int ms) {
            ui.post(() -> {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(Math.max(5, ms), VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            });
        }

        @JavascriptInterface
        public void setBarsColor(String hex, boolean darkIcons) {
            ui.post(() -> {
                int color;
                try {
                    color = (int) Long.parseLong(hex.replace("#", ""), 16) | 0xFF000000;
                } catch (Exception e) {
                    color = 0xFFF3EAD6;
                }
                applySystemBarColors(color, darkIcons);
                root.setBackgroundColor(color);
                webView.setBackgroundColor(color);
            });
        }

        @JavascriptInterface
        public void setSystemBars(String title, String subtitle) { }

        @JavascriptInterface
        public void setStatusBarDark(boolean dark) {
            ui.post(() -> setLightStatusBarIcons(dark));
        }

        @JavascriptInterface
        public void hideKeyboard() {
            ui.post(() -> {
                android.view.inputmethod.InputMethodManager imm =
                        (android.view.inputmethod.InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null && webView != null) imm.hideSoftInputFromWindow(webView.getWindowToken(), 0);
            });
        }

        @JavascriptInterface
        public void requestLocation() {
            ui.post(MainActivity.this::requestNativeLocation);
        }

        @JavascriptInterface
        public boolean isOnline() {
            return networkAvailable();
        }

        @JavascriptInterface
        public String appVersion() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public void toast(String msg) {
            ui.post(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void openUrl(String url) {
            ui.post(() -> handleUrl(Uri.parse(url)));
        }
    }

    private void js(String code) {
        if (webView == null) return;
        ui.post(() -> {
            try { webView.evaluateJavascript(code, null); } catch (Exception ignored) { }
        });
    }

    /* ------------------------------------------------------- геолокация */

    private void requestNativeLocation() {
        if (!hasLocationPermission()) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_COARSE_LOCATION,
                            Manifest.permission.ACCESS_FINE_LOCATION}, REQ_GEO);
            return;
        }
        Location best = getBestLocation();
        if (best == null) {
            js("window.onNativeLocation && window.onNativeLocation(null, null, 'Не удалось определить местоположение. Включите геолокацию.');");
            return;
        }
        js("window.onNativeLocation && window.onNativeLocation(" + best.getLatitude() + "," + best.getLongitude() + ", null);");
    }

    @Nullable
    private Location getBestLocation() {
        try {
            LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return null;
            Location best = null;
            for (String p : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER}) {
                try {
                    if (!lm.isProviderEnabled(p)) continue;
                    Location l = lm.getLastKnownLocation(p);
                    if (l == null) continue;
                    if (best == null || l.getTime() > best.getTime()) best = l;
                } catch (SecurityException | IllegalArgumentException ignored) { }
            }
            return best;
        } catch (Exception e) {
            return null;
        }
    }

    /* ---------------------------------------------------------- сеть */

    private boolean networkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network n = cm.getActiveNetwork();
                if (n == null) return false;
                NetworkCapabilities c = cm.getNetworkCapabilities(n);
                return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            }
            @SuppressWarnings("deprecation")
            android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private void setupNetworkWatcher() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return;
            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override public void onAvailable(@NonNull Network network) {
                    js("window.dispatchEvent(new Event('online'));");
                }
                @Override public void onLost(@NonNull Network network) {
                    js("window.dispatchEvent(new Event('offline'));");
                }
            };
            cm.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception ignored) { }
    }

    /* ------------------------------------------------------ системные бары */

    private void applySystemBarColors(int color, boolean darkIcons) {
        Window w = getWindow();
        w.setStatusBarColor(color);
        w.setNavigationBarColor(color);
        setLightStatusBarIcons(darkIcons);
    }

    private void setLightStatusBarIcons(boolean darkIcons) {
        // darkIcons = true → светлый фон, тёмные иконки
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.setSystemBarsAppearance(
                        darkIcons ? WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS : 0,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
            }
        } else {
            View decor = w.getDecorView();
            int flags = decor.getSystemUiVisibility();
            if (darkIcons) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            decor.setSystemUiVisibility(flags);
        }
    }

    private void setupInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            int top = sys.top + baseInsetTop;
            int bottom = Math.max(sys.bottom, ime.bottom) + baseInsetBottom;
            webView.setPadding(0, top, 0, bottom);
            webView.setClipToPadding(true);
            return insets;
        });
    }

    /* ------------------------------------------------------------- UI */

    private void showLoading(boolean on) {
        if (bar == null) {
            bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
            bar.setMax(100);
            bar.getProgressDrawable().setTint(0xFF93321D);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, dp(2));
            lp.gravity = Gravity.TOP;
            lp.topMargin = baseInsetTop;
            root.addView(bar, lp);
        }
        bar.setVisibility(on ? View.VISIBLE : View.GONE);
        if (!on) bar.setProgress(0);
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    /** Крайний случай: повреждённая сборка, ассеты не открылись */
    private void showFatalOfflineView() {
        if (webView == null) return;
        String html = "<!doctype html><html lang='ru'><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>body{background:#f3ead6;color:#1d1a16;font-family:Georgia,serif;padding:28px;text-align:center}"
                + "h1{font-size:1.7rem;text-transform:uppercase;letter-spacing:.02em;border-bottom:3px double #1d1a16;padding-bottom:10px}"
                + "p{line-height:1.5;color:#4a443a}button{margin-top:14px;background:#1d1a16;color:#f3ead6;border:0;padding:12px 18px;border-radius:3px;font:inherit;text-transform:uppercase;letter-spacing:.06em}"
                + ".o{color:#93321d;font-size:2.4rem}</style></head><body>"
                + "<div class='o'>☂</div><h1>Газета погоды</h1>"
                + "<p>Не удалось открыть свежий номер из локального архива. Переустановите приложение — файлы сборки повреждены.</p>"
                + "<button onclick='location.href=\"file:///android_asset/www/index.html\"'>Попробовать снова</button>"
                + "</body></html>";
        webView.loadDataWithBaseURL("file:///android_asset/www/", html, "text/html", "utf-8", null);
    }

    /* ------------------------------------------------------- жизненный цикл */

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            js("window.onAppResume && window.onAppResume();");
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            js("window.onAppBackground && window.onAppBackground();");
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
                "(function(){if(window.onBackPressed){return window.onBackPressed()?'handled':'pass';}return 'pass';})()",
                value -> {
                    if (value != null && value.contains("handled")) {
                        // панель закрыта или прокрутка наверх — остаёмся в приложении
                        return;
                    }
                    if (webView.canGoBack()) {
                        webView.goBack();
                        return;
                    }
                    long now = System.currentTimeMillis();
                    if (now - lastBackAt < 2200) {
                        finish();
                    } else {
                        lastBackAt = now;
                        Toast.makeText(this, "Нажмите «назад» ещё раз, чтобы закрыть", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (networkCallback != null) {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) cm.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) { }
            networkCallback = null;
        }
        if (webView != null) {
            try {
                root.removeView(webView);
                webView.stopLoading();
                webView.loadUrl("about:blank");
                webView.removeJavascriptInterface("AndroidBridge");
                webView.destroy();
            } catch (Exception ignored) { }
            webView = null;
        }
        super.onDestroy();
    }
}
