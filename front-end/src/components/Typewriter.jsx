import { useState, useEffect, useRef, useMemo } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import MarkdownRenderer from './MarkdownRenderer';

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

/**
 * Typewriter component for smooth text rendering with streaming effect.
 */
const Typewriter = ({ content, onRunQuery, speed = 2, isStreaming = true }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTypingActive, setIsTypingActive] = useState(false);
  const indexRef = useRef(0);
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(0);

  const clearAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  useEffect(() => {
    if (content.length < indexRef.current) {
      indexRef.current = content.length;
      setDisplayedContent(content);
      return;
    }

    const distance = content.length - indexRef.current;
    if (distance <= 0) {
      setIsTypingActive(false);
      return;
    }

    setIsTypingActive(true);

    const typeChunk = (timestamp) => {
      if (timestamp - lastUpdateRef.current < speed) {
        animationFrameRef.current = requestAnimationFrame(typeChunk);
        return;
      }
      
      lastUpdateRef.current = timestamp;

      if (indexRef.current < content.length) {
        const remaining = content.length - indexRef.current;
        let chunkSize = 1;
        if (remaining > 100) chunkSize = 8;
        else if (remaining > 50) chunkSize = 4;
        else if (remaining > 20) chunkSize = 2;
        
        indexRef.current = Math.min(indexRef.current + chunkSize, content.length);
        setDisplayedContent(content.slice(0, indexRef.current));
        
        if (indexRef.current < content.length) {
          animationFrameRef.current = requestAnimationFrame(typeChunk);
        } else {
          setIsTypingActive(false);
        }
      } else {
        setIsTypingActive(false);
      }
    };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(typeChunk);
    }

    return () => clearAnimation();
  }, [content, speed]);

  useEffect(() => {
    if (!isStreaming) {
      clearAnimation();
      setDisplayedContent(content);
      indexRef.current = content.length;
      setIsTypingActive(false);
    }
  }, [isStreaming, content]);

  useEffect(() => () => clearAnimation(), []);

  const showCursor = isStreaming && (isTypingActive || displayedContent.length < content.length);

  const renderedContent = useMemo(() => (
    <MarkdownRenderer content={displayedContent} onRunQuery={onRunQuery} />
  ), [displayedContent, onRunQuery]);

  return (
    <Box sx={{ position: 'relative' }}>
      {renderedContent}
      {showCursor && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            display: 'inline-block',
            width: 2,
            height: '1em',
            backgroundColor: 'text.primary',
            animation: `${blink} 1s steps(1) infinite`,
            opacity: 0.7,
          }}
        />
      )}
    </Box>
  );
};

export default Typewriter;
