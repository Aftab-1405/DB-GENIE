import { useState } from 'react';
import { Box, TextField, IconButton, Tooltip, Typography, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/SchemaOutlined';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';

function ChatInput({ onSend, disabled = false, onOpenSchema, onNewChat }) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasText = message.trim().length > 0;

  // Feature chips for quick actions
  const featureChips = [
    { label: 'Run Query', icon: <TableChartOutlinedIcon sx={{ fontSize: 14 }} />, action: () => onSend?.('Run a sample query') },
    { label: 'View Schema', icon: <SchemaOutlinedIcon sx={{ fontSize: 14 }} />, action: () => onSend?.('Show me all tables') },
    { label: 'New Chat', icon: <AddCommentOutlinedIcon sx={{ fontSize: 14 }} />, action: onNewChat },
  ];

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ 
        p: { xs: 2, sm: 3 },
        pb: { xs: 2, sm: 2.5 },
      }}
    >
      {/* Input Container - Pill shaped like Grok */}
      <Box
        sx={{
          maxWidth: 760,
          mx: 'auto',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1, sm: 1.25 },
          borderRadius: '28px',
          border: '1px solid',
          borderColor: isFocused 
            ? (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')
            : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
          },
        }}
      >
        {/* Attachment icon (placeholder) */}
        <IconButton
          size="small"
          sx={{
            color: 'text.secondary',
            opacity: 0.6,
            '&:hover': {
              opacity: 1,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }
          }}
        >
          <AttachFileRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Input */}
        <TextField
          fullWidth
          multiline
          maxRows={5}
          placeholder="What do you want to know?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { 
              fontSize: '0.95rem',
              lineHeight: 1.6,
              py: 0.5,
              color: 'text.primary',
            },
          }}
          sx={{ 
            '& .MuiInputBase-root': { 
              p: 0,
              alignItems: 'center',
            },
            '& .MuiInputBase-input': {
              py: 0,
              '&::placeholder': {
                color: 'text.secondary',
                opacity: 0.7,
              }
            },
          }}
        />

        {/* Send Button */}
        <Tooltip title={hasText ? 'Send message' : 'Type a message'}>
          <span>
            <IconButton
              type="submit"
              disabled={!hasText || disabled}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: hasText 
                  ? (isDarkMode ? '#ffffff' : '#000000')
                  : 'transparent',
                color: hasText 
                  ? (isDarkMode ? '#000000' : '#ffffff')
                  : 'text.disabled',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: hasText 
                    ? (isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)')
                    : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                },
                '&.Mui-disabled': {
                  backgroundColor: 'transparent',
                  color: 'text.disabled',
                },
              }}
            >
              <SendRoundedIcon sx={{ fontSize: 18, ml: 0.25 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Feature Chips - Below input like Grok */}
      <Box
        sx={{
          maxWidth: 760,
          mx: 'auto',
          mt: 1.5,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {featureChips.map((chip) => (
          <Chip
            key={chip.label}
            icon={chip.icon}
            label={chip.label}
            onClick={chip.action}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: '16px',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
              color: 'text.secondary',
              fontSize: '0.8rem',
              height: 30,
              backgroundColor: 'transparent',
              transition: 'all 0.15s ease',
              '& .MuiChip-icon': {
                color: 'inherit',
                ml: 0.5,
              },
              '&:hover': {
                borderColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                color: 'text.primary',
              },
            }}
          />
        ))}
      </Box>

      {/* Footer hint */}
      <Typography
        variant="caption"
        sx={{ 
          display: 'block',
          textAlign: 'center',
          mt: 1.5,
          color: 'text.secondary', 
          opacity: 0.4,
          fontSize: '0.7rem',
        }}
      >
        AI-powered • Always verify SQL queries before running
      </Typography>
    </Box>
  );
}

export default ChatInput;
