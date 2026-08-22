import { motion } from "framer-motion";
import AppHeader from "./AppHeader";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: "easeIn" } },
};

const PageContainer = ({
  children,
  title,
  showHeader = true,
  showBack = false,
  onBack,
  action,
  showNotification = true,
  showLive = true,
  className = "",
  style = {},
}) => {
  return (
    <div className="app-page-wrapper">
      {showHeader && (
        <AppHeader
          title={title}
          showBack={showBack}
          onBack={onBack}
          action={action}
          showNotification={showNotification}
          showLive={showLive}
        />
      )}

      <motion.main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
        style={{
          width: "100%",
          maxWidth: "var(--app-max-width)",
          margin: "0 auto",
          paddingLeft: 16,
          paddingRight: 16,
          flex: 1,
          boxSizing: "border-box",
          ...style,
        }}
      >
        {children}
      </motion.main>
    </div>
  );
};

export default PageContainer;
