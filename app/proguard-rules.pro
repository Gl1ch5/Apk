# WebView + AndroidX
-dontwarn android.webkit.**
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.gl1ch5.weathergazette.MainActivity$Bridge { *; }
-keepattributes JavascriptInterface
