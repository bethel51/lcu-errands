/**
 * Guards the /auth/init endpoint so it can only be reached when the
 * SETUP_MODE environment variable is explicitly set to "true".
 *
 * This prevents accidental or malicious admin account creation after
 * the initial setup has been completed. To enable setup mode, set
 * SETUP_MODE=true in the Vercel project environment variables, then remove it
 * once the first admin account has been created.
 */
export const requireSetupMode = (req, res, next) => {
  if (process.env.SETUP_MODE !== "true") {
    console.warn(
      `🛡️ [SETUP] Blocked attempt to access /auth/init — SETUP_MODE is not enabled. IP: ${req.ip}`,
    );
    res.status(403).json({
      message:
        "Setup mode is not enabled. Set SETUP_MODE=true to allow initialization.",
    });
    return;
  }

  console.log(
    `🛡️ [SETUP] Setup mode is active — /auth/init access granted. IP: ${req.ip}`,
  );
  next();
};
