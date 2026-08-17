const { withEntitlementsPlist } = require("expo/config-plugins");

// expo-notifications' (auto-applied) config plugin adds the aps-environment
// entitlement, but OpenTrainer only schedules LOCAL notifications (rest
// timers) — no APNs. The provisioning profile deliberately has no Push
// Notifications capability, and Xcode refuses to archive when the entitlement
// and profile disagree, so strip the entitlement. Must run last in the
// plugins array.
module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
