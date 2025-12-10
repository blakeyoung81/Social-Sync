'use client';

/**
 * DynamicCaption Component
 * 
 * A powerful caption component that supports multiple animation styles:
 * - typewriter: Types out text character by character with typing animation
 * - bounce: Bouncy entrance with individual letter bouncing animation  
 * - glow: Neon glow effect with pulsing animation
 * - karaoke: Karaoke-style word highlighting as they play
 * - pop: Dramatic pop-in with rotation and elastic easing
 * - slide: Smooth slide-in from the side with spring physics
 * - scale: Dramatic scale-up entrance with breathing effect
 * - rainbow: Animated rainbow gradient background with dancing letters
 * 
 * Built with Framer Motion and react-type-animation for smooth, 
 * hardware-accelerated animations that look professional and engaging.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';

interface DynamicCaptionProps {
  text: string;
  style: 'typewriter' | 'bounce' | 'glow' | 'karaoke' | 'pop' | 'slide' | 'scale' | 'rainbow';
  isActive: boolean;
}

export const DynamicCaption: React.FC<DynamicCaptionProps> = ({ text, style, isActive }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const words = text.split(' ');

  // For karaoke effect - highlight words progressively
  useEffect(() => {
    if (style === 'karaoke' && isActive) {
      const interval = setInterval(() => {
        setCurrentWordIndex(prev => {
          if (prev >= words.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 300); // Highlight a word every 300ms

      return () => clearInterval(interval);
    }
  }, [isActive, style, words.length]);

  if (!isActive) return null;

  const baseStyles = {
    position: 'absolute' as const,
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: '80%',
    textAlign: 'center' as const,
    zIndex: 20,
    fontWeight: 'bold',
    fontSize: '1.5rem',
    padding: '12px 24px',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const renderCaption = () => {
    switch (style) {
      case 'typewriter':
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              border: '2px solid #3b82f6',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <TypeAnimation
              sequence={[text]}
              wrapper="span"
              speed={50}
              style={{ display: 'inline-block' }}
              cursor={false}
            />
          </motion.div>
        );

      case 'bounce':
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(255, 0, 150, 0.9)',
              color: 'white',
              border: '3px solid #ffffff',
            }}
            initial={{ scale: 0, y: 50 }}
            animate={{ 
              scale: [0, 1.2, 1],
              y: [50, -10, 0],
            }}
            exit={{ scale: 0, y: -50 }}
            transition={{ 
              duration: 0.6,
              ease: "easeOut",
              times: [0, 0.6, 1]
            }}
          >
            {text.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ y: 0 }}
                animate={{ 
                  y: [0, -8, 0],
                }}
                transition={{ 
                  duration: 0.5,
                  delay: i * 0.05,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.div>
        );

      case 'glow':
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              color: '#00ff88',
              textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88',
              border: '2px solid #00ff88',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 1],
              scale: [0.8, 1.05, 1],
              textShadow: [
                '0 0 10px #00ff88',
                '0 0 20px #00ff88, 0 0 40px #00ff88',
                '0 0 10px #00ff88'
              ]
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 0.8,
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: 1
            }}
          >
            {text}
          </motion.div>
        );

      case 'karaoke':
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              color: 'white',
              border: '2px solid #fbbf24',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {words.map((word, index) => (
              <motion.span
                key={index}
                style={{
                  color: index <= currentWordIndex ? '#fbbf24' : 'white',
                  marginRight: '8px',
                }}
                animate={{
                  scale: index === currentWordIndex ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
        );

      case 'pop':
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(168, 85, 247, 0.95)',
              color: 'white',
              border: '3px solid #ffffff',
            }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: [0, 1.3, 1],
              rotate: [-180, 10, 0],
            }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ 
              duration: 0.7,
              ease: [0.68, -0.55, 0.265, 1.55]
            }}
          >
            {text.split(' ').map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                style={{ marginRight: '8px' }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
        );

      case 'slide':
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              color: 'white',
              border: '2px solid #ffffff',
            }}
            initial={{ x: '-100vw', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100vw', opacity: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 20
            }}
          >
            {text}
          </motion.div>
        );

      case 'scale':
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              border: '3px solid #ffffff',
            }}
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
            }}
            exit={{ scale: 0 }}
            transition={{ 
              duration: 0.5,
              ease: "backOut"
            }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {text}
            </motion.div>
          </motion.div>
        );

      case 'rainbow':
        return (
          <motion.div
            style={{
              ...baseStyles,
              background: 'linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #ff0080)',
              backgroundSize: '400% 400%',
              color: 'white',
              border: '3px solid #ffffff',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1,
              scale: [0.5, 1.1, 1],
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ 
              scale: { duration: 0.6, ease: "backOut" },
              backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" }
            }}
          >
            {text.split('').map((char, i) => (
              <motion.span
                key={i}
                animate={{
                  y: [0, -5, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.div>
        );

      default:
        return (
          <motion.div
            style={{
              ...baseStyles,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {text}
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {renderCaption()}
    </AnimatePresence>
  );
}; 