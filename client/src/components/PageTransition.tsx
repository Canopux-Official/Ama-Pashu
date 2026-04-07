import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
    initial: { opacity: 0, y: 15 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -15 },
};

const pageTransition = {
    type: 'tween' as const,
    ease: 'easeOut' as const,
    duration: 0.15,
};

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', position: 'relative' }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
