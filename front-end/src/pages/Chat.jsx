
import { 
  Box, 
  Typography, 
  IconButton,
  Tooltip,
  Drawer, 
  AppBar, 
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Snackbar,
  Alert,
  Dialog,
} from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatInput from '../components/ChatInput';
import MessageList from '../components/MessageList';
import DatabaseModal from '../components/DatabaseModal';
import SQLResultsTable from '../components/SQLResultsTable';

const DRAWER_WIDTH = 260;

function Chat() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [currentDatabase, setCurrentDatabase] = useState(null);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  const messagesContainerRef = useRef(null);
  const { user, logout } = useAuth();

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    checkDbStatus();
    fetchConversations();
  }, []);

  const checkDbStatus = async () => {
    try {
      const response = await fetch('/db_status');
      const data = await response.json();
      setIsDbConnected(data.connected || false);
      setCurrentDatabase(data.current_database || null);
    } catch (error) {
      console.error('Failed to check DB status:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/get_conversations');
      const data = await response.json();
      if (data.status === 'success') {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleDesktopToggle = () => setDesktopOpen(!desktopOpen);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = async () => { handleMenuClose(); await logout(); };

  const handleNewChat = async () => {
    setMessages([]);
    setCurrentConversationId(null);
    setQueryResults(null);
    setMobileOpen(false);
    
    try {
      const response = await fetch('/new_conversation', { method: 'POST' });
      const data = await response.json();
      if (data.status === 'success') {
        setCurrentConversationId(data.conversation_id);
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleSelectConversation = async (conversationId) => {
    try {
      const response = await fetch(`/get_conversation/${conversationId}`);
      const data = await response.json();
      if (data.status === 'success' && data.conversation) {
        setCurrentConversationId(conversationId);
        const formattedMessages = (data.conversation.messages || []).map((msg) => ({
          sender: msg.sender,
          content: msg.content,
        }));
        setMessages(formattedMessages);
        setQueryResults(null);
        setMobileOpen(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await fetch(`/delete_conversation/${conversationId}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (currentConversationId === conversationId) handleNewChat();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleDbConnect = (data) => {
    if (data) {
      setIsDbConnected(true);
      if (data.selectedDatabase) setCurrentDatabase(data.selectedDatabase);
      setSnackbar({ open: true, message: 'Connected to database!', severity: 'success' });
    } else {
      setIsDbConnected(false);
      setCurrentDatabase(null);
      setSnackbar({ open: true, message: 'Disconnected from database', severity: 'info' });
    }
  };

  const handleRunQuery = async (sql) => {
    if (!isDbConnected) {
      setSnackbar({ open: true, message: 'Please connect to a database first', severity: 'warning' });
      setDbModalOpen(true);
      return;
    }

    try {
      const response = await fetch('/run_sql_query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql_query: sql }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        // Transform backend data to SQLResultsTable format
        // Backend sends: { result: { fields: [...], rows: [[...], [...]] }, row_count, execution_time_ms }
        // SQLResultsTable expects: { columns: [...], result: [{col1: val1, col2: val2}, ...], row_count, execution_time }
        const columns = data.result?.fields || [];
        const rows = data.result?.rows || [];
        
        // Transform rows from array of arrays to array of objects with column names as keys
        const transformedResult = rows.map(row => {
          const obj = {};
          columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        });
        
        setQueryResults({
          columns,
          result: transformedResult,
          row_count: data.row_count,
          total_rows: data.total_rows,
          truncated: data.truncated,
          execution_time: data.execution_time_ms ? data.execution_time_ms / 1000 : null, // Convert ms to seconds
        });
        setSnackbar({ open: true, message: `Query returned ${data.row_count} rows`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.message || 'Query failed', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to execute query', severity: 'error' });
    }
  };

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Add user message and scroll immediately
    setMessages((prev) => [...prev, { sender: 'user', content: message }]);
    setIsLoading(true);
    
    // Immediate scroll
    setTimeout(scrollToBottom, 10);

    try {
      const response = await fetch('/pass_userinput_to_gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message, conversation_id: currentConversationId }),
      });

      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId && !currentConversationId) {
        setCurrentConversationId(newConversationId);
        fetchConversations();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiResponse += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.sender === 'ai') {
            updated[updated.length - 1].content = aiResponse;
          } else {
            updated.push({ sender: 'ai', content: aiResponse });
          }
          return updated;
        });
      }
    } catch (error) {
      setMessages((prev) => [...prev, { sender: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Sidebar content
  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Main Sidebar Content (Scrollable) */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isConnected={isDbConnected}
        currentDatabase={currentDatabase}
        onOpenDbModal={() => setDbModalOpen(true)}
        onSchemaChange={(data) => {
          if (data) {
            setSnackbar({ 
              open: true, 
              message: `Selected schema: ${data.schema} (${data.tables?.length || 0} tables)`, 
              severity: 'success' 
            });
          }
        }}
      />
      
      {/* Profile Section (Fixed at bottom) */}
      <Box sx={{ flexShrink: 0 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />
        <Box
          onClick={handleMenuOpen}
          sx={{
            p: 1.5,
            m: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            borderRadius: 2,
            border: '1px solid transparent',
            transition: 'all 0.15s ease',
            '&:hover': { 
              backgroundColor: 'rgba(148, 163, 184, 0.06)',
              borderColor: 'rgba(148, 163, 184, 0.1)',
            },
          }}
        >
          <Avatar 
            src={user?.photoURL} 
            sx={{ 
              width: 32, 
              height: 32,
              border: '2px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            {user?.displayName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="body2" 
              fontWeight={500} 
              noWrap
              sx={{ fontSize: '0.8rem' }}
            >
              {user?.displayName || 'User'}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              noWrap
              sx={{ display: 'block', fontSize: '0.7rem' }}
            >
              {user?.email || ''}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          backgroundColor: 'background.default',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            <MenuRoundedIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box component="img" src="/product-logo.png" alt="DB-Genie" sx={{ width: 24, height: 24, mr: 1 }} />
            <Typography variant="subtitle1" fontWeight={600}>DB-Genie</Typography>
          </Box>
          <Avatar src={user?.photoURL} sx={{ width: 32, height: 32, cursor: 'pointer' }} onClick={handleMenuOpen} />
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 180, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>{user?.displayName}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
        <MenuItem disabled><ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>Settings</MenuItem>
        <MenuItem onClick={handleLogout}><ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>Sign out</MenuItem>
      </Menu>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'background.default', borderRight: '1px solid', borderColor: 'divider' },
        }}
      >
        <Toolbar>
          <Box component="img" src="/product-logo.png" alt="DB-Genie" sx={{ width: 24, height: 24, mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={600}>DB-Genie</Typography>
        </Toolbar>
        {sidebarContent}
      </Drawer>

      {/* Desktop Sidebar */}
      <Drawer
        variant="persistent"
        open={desktopOpen}
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'background.default', borderRight: '1px solid', borderColor: 'divider' },
        }}
      >
        <Toolbar sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)', px: 2 }}>
          <Box 
            onClick={handleDesktopToggle}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              opacity: 0.8,
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 1 }
            }}
          >
            <Box component="img" src="/product-logo.png" alt="DB-Genie" sx={{ width: 24, height: 24, mr: 1 }} />
            <Typography variant="subtitle1" fontWeight={600}>DB-Genie</Typography>
          </Box>
        </Toolbar>
        {sidebarContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { md: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: desktopOpen ? `${DRAWER_WIDTH}px` : 0 },
          mt: { xs: '56px', md: 0 },
          height: { xs: 'calc(100vh - 56px)', md: '100vh' },
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          transition: 'margin 225ms cubic-bezier(0, 0, 0.2, 1) 0ms, width 225ms cubic-bezier(0, 0, 0.2, 1) 0ms',
          position: 'relative',
        }}
      >
        {/* Desktop Sidebar Toggle - Floating Logo (Only visible when sidebar is closed) */}
        {/* Desktop Sidebar Toggle - Floating Logo (Only visible when sidebar is closed) */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 12, 
            left: 16, 
            zIndex: 10, 
            display: { xs: 'none', md: 'block' },
            opacity: desktopOpen ? 0 : 1,
            pointerEvents: desktopOpen ? 'none' : 'auto',
            transform: desktopOpen ? 'translateX(-20px)' : 'translateX(0)',
            transition: 'all 225ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Tooltip title="Open sidebar">
            <IconButton 
              onClick={handleDesktopToggle}
              sx={{ 
                p: 0.5,
                bgcolor: 'transparent', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } 
              }}
            >
              <Box component="img" src="/product-logo.png" alt="Open sidebar" sx={{ width: 28, height: 28 }} />
            </IconButton>
          </Tooltip>
        </Box>
        {/* Messages Container */}
        <Box 
          ref={messagesContainerRef}
          sx={{ flex: 1, overflow: 'auto', scrollBehavior: 'smooth' }}
        >
          <MessageList
            messages={messages}
            user={user}
            onRunQuery={handleRunQuery}
            onSuggestionClick={handleSendMessage}
            isTyping={isLoading}
          />
        </Box>

        {/* Input */}
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </Box>

      {/* Modals */}
      <DatabaseModal open={dbModalOpen} onClose={() => setDbModalOpen(false)} onConnect={handleDbConnect} isConnected={isDbConnected} currentDatabase={currentDatabase} />
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
      
      {/* SQL Results Modal */}
      <Dialog
        open={Boolean(queryResults)}
        onClose={() => setQueryResults(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            maxHeight: '85vh',
            borderRadius: 2,
          }
        }}
      >
        {queryResults && <SQLResultsTable data={queryResults} onClose={() => setQueryResults(null)} />}
      </Dialog>
    </Box>
  );
}

export default Chat;
