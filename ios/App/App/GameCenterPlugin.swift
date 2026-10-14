import Capacitor
import GameKit

/// Game Center for the web layer: sign in, send a score to a leaderboard, show the leaderboard.
/// Everything resolves (never rejects) when the player is not signed in, so the game is never held up by it.
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievement", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showAchievements", returnType: CAPPluginReturnPromise),
    ]

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let player = GKLocalPlayer.local
            if player.isAuthenticated {
                call.resolve(["signedIn": true])
                return
            }
            var answered = false
            player.authenticateHandler = { [weak self] viewController, _ in
                if let viewController = viewController {
                    self?.bridge?.viewController?.present(viewController, animated: true)
                    return
                }
                if !answered {
                    answered = true
                    call.resolve(["signedIn": GKLocalPlayer.local.isAuthenticated])
                }
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let id = call.getString("leaderboardId"), let score = call.getInt("score") else {
            call.reject("leaderboardId and score are required")
            return
        }
        guard GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["submitted": false])
            return
        }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
            call.resolve(["submitted": error == nil])
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        guard let id = call.getString("leaderboardId") else {
            call.reject("leaderboardId is required")
            return
        }
        DispatchQueue.main.async {
            // the sign-in may still be in progress (or may have been lost): ask again before giving up
            if !GKLocalPlayer.local.isAuthenticated {
                GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
                    if let viewController = viewController {
                        self?.bridge?.viewController?.present(viewController, animated: true)
                        return
                    }
                    self?.presentLeaderboard(id, call, error)
                }
                return
            }
            self.presentLeaderboard(id, call, nil)
        }
    }

    /// Sets how far an achievement is (0...100). 100 unlocks it; Game Center shows the banner once.
    @objc func reportAchievement(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id is required")
            return
        }
        let percent = max(0, min(100, call.getDouble("percent") ?? 0))
        guard GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["reported": false])
            return
        }
        let achievement = GKAchievement(identifier: id)
        achievement.percentComplete = percent
        achievement.showsCompletionBanner = true
        GKAchievement.report([achievement]) { error in
            call.resolve(["reported": error == nil])
        }
    }

    @objc func showAchievements(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated, let host = self.bridge?.viewController else {
                call.resolve(["shown": false, "reason": "not-signed-in"])
                return
            }
            let controller = GKGameCenterViewController(state: .achievements)
            controller.gameCenterDelegate = self
            var top = host
            while let next = top.presentedViewController { top = next }
            top.present(controller, animated: true)
            call.resolve(["shown": true])
        }
    }

    private func presentLeaderboard(_ id: String, _ call: CAPPluginCall, _ error: Error?) {
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.resolve(["shown": false, "reason": "not-signed-in", "detail": error?.localizedDescription ?? ""])
                return
            }
            guard let host = self.bridge?.viewController else {
                call.resolve(["shown": false, "reason": "no-view", "detail": ""])
                return
            }
            let controller = GKGameCenterViewController(leaderboardID: id, playerScope: .global, timeScope: .allTime)
            controller.gameCenterDelegate = self
            // present from the top-most view controller, whatever is already on screen
            var top = host
            while let next = top.presentedViewController { top = next }
            top.present(controller, animated: true)
            call.resolve(["shown": true])
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
