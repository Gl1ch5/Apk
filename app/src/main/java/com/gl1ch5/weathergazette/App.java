package com.gl1ch5.weathergazette;

import android.app.Application;
import android.os.Build;
import android.webkit.WebView;

/**
 * Точка входа процесса.
 *
 * 1. Страховка: приложение не должно падать молча — любое необработанное
 *    исключение логируется (видно в logcat по тегу WeatherGazette).
 * 2. Разрешаем отладку WebView (chrome://inspect) в debug-сборках.
 */
public class App extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, error) -> {
            android.util.Log.e("WeatherGazette", "Необработанное исключение в " + thread.getName(), error);
            if (previous != null) previous.uncaughtException(thread, error);
        });

        if (BuildConfig.DEBUG && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
