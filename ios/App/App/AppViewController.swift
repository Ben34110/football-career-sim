import Capacitor

/// The web view controller of the app: adds the plugins that live in this project (not in node_modules).
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        // no scroll indicator on the side of the game
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        bridge?.registerPluginInstance(GameCenterPlugin())
    }
}
