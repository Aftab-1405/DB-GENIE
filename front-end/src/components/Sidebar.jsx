import { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Divider, Popover, List, ListItemButton, ListItemText, ListItemIcon } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

// Icons
import EditNoteIcon from '@mui/icons-material/EditNote';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SchemaSelector from './SchemaSelector';

// Sidebar widths
const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 56;

function Sidebar({ 
  conversations = [], 
  currentConversationId, 
  onNewChat, 
  onSelectConversation, 
  onDeleteConversation,
  isConnected,
  currentDatabase,
  dbType,
  availableDatabases = [],
  onOpenDbModal,
  onDatabaseSwitch,
  onSchemaChange,
  // New props for collapse control
  isCollapsed = false,
  onToggleCollapse,
  onOpenSettings,
}) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [dbPopoverAnchor, setDbPopoverAnchor] = useState(null);
  const isPopoverOpen = Boolean(dbPopoverAnchor);

  const handleDbCardClick = (event) => {
    if (isConnected && availableDatabases.length > 0) {
      setDbPopoverAnchor(event.currentTarget);
    } else {
      onOpenDbModal?.();
    }
  };

  const handleDatabaseSelect = (dbName) => {
    setDbPopoverAnchor(null);
    if (dbName !== currentDatabase) {
      onDatabaseSwitch?.(dbName);
    }
  };

  // Navigation items for Grok-style nav
  const navItems = [
    { icon: <SearchIcon />, label: 'Search', tooltip: 'Search', action: () => {} },
    { icon: <EditNoteIcon />, label: 'New Chat', tooltip: 'New Chat', action: onNewChat },
    { icon: <StorageRoundedIcon />, label: 'Database', tooltip: isConnected ? currentDatabase : 'Connect Database', action: onOpenDbModal },
    { icon: <HistoryIcon />, label: 'History', tooltip: 'History', isSection: true },
  ];

  return (
    <Box 
      sx={{ 
        width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        minWidth: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        height: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#000000' : '#f8f8f8',
        borderRight: '1px solid',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
      }}
    >
      {/* ===== TOP: Logo Area ===== */}
      <Box 
        sx={{ 
          p: isCollapsed ? 1.5 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: 1.5,
          minHeight: 56,
        }}
      >
        <Box 
          component="img" 
          src="/product-logo.png" 
          alt="DB-Genie" 
          sx={{ 
            width: 28, 
            height: 28,
            cursor: 'pointer',
            opacity: 0.9,
            transition: 'opacity 0.2s',
            '&:hover': { opacity: 1 }
          }} 
          onClick={onToggleCollapse}
        />
        {!isCollapsed && (
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              letterSpacing: '-0.01em',
            }}
          >
            DB-Genie
          </Typography>
        )}
      </Box>

      {/* ===== NAVIGATION ITEMS ===== */}
      <Box sx={{ px: isCollapsed ? 0.75 : 1.5, py: 1 }}>
        {navItems.map((item, index) => (
          item.isSection ? (
            // Section header
            !isCollapsed && (
              <Typography 
                key={index}
                variant="overline" 
                color="text.secondary" 
                sx={{ 
                  display: 'block',
                  px: 1,
                  pt: 2,
                  pb: 0.5,
                  fontSize: '0.65rem',
                }}
              >
                {item.label}
              </Typography>
            )
          ) : (
            <Tooltip 
              key={index}
              title={isCollapsed ? item.tooltip : ''} 
              placement="right"
              arrow
            >
              <Box
                onClick={item.action}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: isCollapsed ? 1 : 1.25,
                  mb: 0.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  color: 'text.secondary',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: 'text.primary',
                  },
                  // Database connection indicator
                  ...(item.label === 'Database' && {
                    position: 'relative',
                    '&::after': isConnected ? {
                      content: '""',
                      position: 'absolute',
                      top: isCollapsed ? 8 : 10,
                      right: isCollapsed ? 8 : 'auto',
                      left: isCollapsed ? 'auto' : 26,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'success.main',
                    } : {},
                  }),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                  {item.icon}
                </Box>
                {!isCollapsed && (
                  <Typography variant="body2" sx={{ fontWeight: 450 }}>
                    {item.label}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          )
        ))}
      </Box>

      {/* ===== PostgreSQL Schema Selector (only when expanded) ===== */}
      {!isCollapsed && (
        <SchemaSelector 
          isConnected={isConnected} 
          currentDatabase={currentDatabase}
          dbType={dbType}
          onSchemaChange={onSchemaChange}
        />
      )}

      {/* ===== CONVERSATIONS LIST (Scrollable) ===== */}
      <Box 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Conversations Container */}
        <Box 
          sx={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
            px: isCollapsed ? 0.5 : 1,
            py: 0.5,
            '&::-webkit-scrollbar': {
              width: 4,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(theme.palette.text.secondary, 0.15),
              borderRadius: 2,
              '&:hover': {
                backgroundColor: alpha(theme.palette.text.secondary, 0.25),
              }
            },
          }}
        >
          {conversations.length === 0 ? (
            !isCollapsed && (
              <Box 
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  opacity: 0.4,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  No conversations yet
                </Typography>
              </Box>
            )
          ) : (
            conversations.map((conv) => (
              <Tooltip 
                key={conv.id}
                title={isCollapsed ? (conv.title || 'Conversation') : ''} 
                placement="right"
                arrow
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: isCollapsed ? 1 : 1.25,
                    mb: 0.25,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    backgroundColor: conv.id === currentConversationId 
                      ? (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
                      : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: conv.id === currentConversationId 
                        ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                        : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      '& .delete-btn': { opacity: 1 }
                    }
                  }}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  {isCollapsed ? (
                    <QuestionAnswerOutlinedIcon 
                      sx={{ 
                        fontSize: 18, 
                        color: conv.id === currentConversationId ? 'text.primary' : 'text.secondary',
                      }} 
                    />
                  ) : (
                    <>
                      <QuestionAnswerOutlinedIcon 
                        sx={{ 
                          fontSize: 16, 
                          color: conv.id === currentConversationId ? 'text.primary' : 'text.secondary', 
                          mr: 1.5,
                          flexShrink: 0,
                        }} 
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          variant="body2" 
                          noWrap 
                          sx={{ 
                            color: conv.id === currentConversationId ? 'text.primary' : 'text.secondary',
                            fontWeight: conv.id === currentConversationId ? 500 : 400,
                            fontSize: '0.85rem',
                          }}
                        >
                          {conv.title || 'New Conversation'}
                        </Typography>
                      </Box>
                      <IconButton
                        className="delete-btn"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        sx={{ 
                          opacity: 0, 
                          padding: 0.5,
                          ml: 0.5,
                          color: 'text.secondary',
                          transition: 'all 0.15s ease',
                          '&:hover': { 
                            color: 'error.main', 
                            backgroundColor: alpha(theme.palette.error.main, 0.1), 
                          }
                        }}
                      >
                        <DeleteForeverOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Tooltip>
            ))
          )}
        </Box>
      </Box>

      {/* Database Switcher Popover */}
      <Popover
        open={isPopoverOpen}
        anchorEl={dbPopoverAnchor}
        onClose={() => setDbPopoverAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            maxHeight: 300,
            overflow: 'auto',
          }
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="overline" color="text.secondary">
            Switch Database
          </Typography>
        </Box>
        <List dense sx={{ p: 0.5 }}>
          {availableDatabases.map((db) => (
            <ListItemButton
              key={db}
              selected={db === currentDatabase}
              onClick={() => handleDatabaseSelect(db)}
              sx={{ borderRadius: 1, py: 0.75 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                {db === currentDatabase ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <StorageRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                )}
              </ListItemIcon>
              <ListItemText 
                primary={db} 
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <ListItemButton
            onClick={() => { setDbPopoverAnchor(null); onOpenDbModal?.(); }}
            sx={{ borderRadius: 1, py: 0.75 }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <AddCircleOutlineRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText 
              primary="New Connection" 
              primaryTypographyProps={{ variant: 'body2', color: 'primary.main' }}
            />
          </ListItemButton>
        </List>
      </Popover>

      {/* ===== BOTTOM: Collapse Toggle + Settings ===== */}
      <Box 
        sx={{ 
          borderTop: '1px solid',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          p: isCollapsed ? 0.75 : 1,
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: isCollapsed ? 1 : 0,
        }}
      >
        {/* Settings button */}
        <Tooltip title={isCollapsed ? 'Settings' : ''} placement="right" arrow>
          <IconButton
            onClick={onOpenSettings}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: 'text.primary',
              }
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Collapse/Expand toggle */}
        <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right" arrow>
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: 'text.primary',
              }
            }}
          >
            {isCollapsed ? (
              <ChevronRightIcon sx={{ fontSize: 18 }} />
            ) : (
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default Sidebar;
