package com.havenride.app;

import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        
        // Prevent external browser from opening
        // Force all navigation to stay within the WebView
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            
            // Enable geolocation in WebView
            settings.setGeolocationEnabled(true);
            settings.setJavaScriptEnabled(true);
            
            // Enable WebGL for Mapbox GL JS
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            // Note: setAppCacheEnabled is deprecated and removed in API 33+
            // Cache is now handled automatically by the WebView
            
            // Enable hardware acceleration for WebGL
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
            
            // Set WebChromeClient to handle geolocation permissions
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                    // Always grant geolocation permission (permissions are handled by Android runtime)
                    callback.invoke(origin, true, false);
                }
            });
            
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    // Always load in WebView, never open external browser
                    return false; // Return false to load in WebView
                }
                
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    // Always load in WebView, never open external browser  
                    return false; // Return false to load in WebView
                }
            });
        }
    }
}
