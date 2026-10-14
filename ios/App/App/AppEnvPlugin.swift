import Capacitor
import Foundation

/// Tells the web layer where the app is running: from TestFlight, or from the App Store.
/// (TestFlight builds carry a "sandbox receipt"; the real App Store ones a "receipt".)
@objc(AppEnvPlugin)
public class AppEnvPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppEnvPlugin"
    public let jsName = "AppEnv"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isTestFlight", returnType: CAPPluginReturnPromise),
    ]

    @objc func isTestFlight(_ call: CAPPluginCall) {
        let receipt = Bundle.main.appStoreReceiptURL?.lastPathComponent
        call.resolve(["testFlight": receipt == "sandboxReceipt"])
    }
}
