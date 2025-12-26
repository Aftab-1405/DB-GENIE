import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Box, Typography, Collapse, useTheme } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import NoiseAwareIcon from '@mui/icons-material/NoiseAware';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import DataArrayRoundedIcon from '@mui/icons-material/DataArrayRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import Editor from '@monaco-editor/react';

// Animations
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
`;

// Tool configurations
const TOOL_CONFIG = {
  'get_connection_status': { action: 'Checking connection', pastAction: 'Checked connection', icon: LinkRoundedIcon },
  'get_database_list': { action: 'Listing databases', pastAction: 'Listed databases', icon: StorageRoundedIcon },
  'get_database_schema': { action: 'Fetching schema', pastAction: 'Fetched schema', icon: TableChartRoundedIcon },
  'get_table_columns': { action: 'Getting table structure', pastAction: 'Got table structure', icon: ViewColumnRoundedIcon },
  'execute_query': { action: 'Running query', pastAction: 'Executed query', icon: PlayArrowRoundedIcon },
  'get_recent_queries': { action: 'Fetching query history', pastAction: 'Fetched query history', icon: HistoryRoundedIcon },
  'get_sample_data': { action: 'Getting sample data', pastAction: 'Got sample data', icon: DataArrayRoundedIcon },
};

// OPTIMIZED: Pre-create array to avoid recreation
const DOT_INDICES = [0, 1, 2];

// Animated dots for loading states - OPTIMIZED with memo
const AnimatedDots = memo(() => (
  <Box component="span" sx={{ display: 'inline-flex', gap: '3px', ml: 0.75 }}>
    {DOT_INDICES.map((i) => (
      <Box
        key={i}
        component="span"
        sx={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          animation: `${dotPulse} 1.4s ease-in-out infinite`,
          animationDelay: `${i * 0.16}s`,
        }}
      />
    ))}
  </Box>
));
AnimatedDots.displayName = 'AnimatedDots';

/**
 * Inline Thinking Block - Shows AI's reasoning process - OPTIMIZED
 */
export const InlineThinkingBlock = memo(({ content, isActive, isFirst = false }) => {
  const [expanded, setExpanded] = useState(isActive);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (isActive) {
      setExpanded(true);
    } else if (content && !isActive) {
      const timer = setTimeout(() => setExpanded(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isActive, content]);

  // OPTIMIZED: Memoize toggle handler
  const handleToggle = useCallback(() => setExpanded(prev => !prev), []);

  // OPTIMIZED: Memoize color calculations - REFINED: Icon gets semantic color, UI stays subtle
  const iconColor = useMemo(() => '#A855F7', []); // Purple-500 for AI reasoning/thinking

  const uiColors = useMemo(() => ({
    bg: alpha(theme.palette.text.primary, isDark ? 0.04 : 0.03),
    border: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.08),
    text: theme.palette.text.primary,
  }), [theme.palette.text.primary, isDark]);

  if (!content && !isActive) return null;

  return (
    <Box sx={{ my: isFirst ? 0 : 1.5, animation: `${fadeInUp} 0.3s ease-out` }}>
      <Box
        onClick={handleToggle}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.625,
          borderRadius: 2,
          backgroundColor: uiColors.bg,
          border: `1px solid ${uiColors.border}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': { backgroundColor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.06) },
        }}
      >
        <KeyboardArrowDownIcon
          sx={{
            fontSize: 16,
            color: uiColors.text,
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }}
        />
        <NoiseAwareIcon sx={{ fontSize: 15, color: iconColor }} />
        <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 500, color: uiColors.text }}>
          {isActive ? 'Thinking' : 'Thought process'}
        </Typography>
        {isActive && <AnimatedDots />}
        {!expanded && content && (
          <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 0.5 }}>
            ({content.length} chars)
          </Typography>
        )}
      </Box>

      <Collapse in={expanded} timeout={200}>
        <Box sx={{ mt: 0.75, ml: 1, pl: 1.5, borderLeft: `2px solid ${uiColors.border}` }}>
          <Box
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.04 : 0.03),
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '0.72rem',
              lineHeight: 1.6,
              color: isDark ? alpha('#fff', 0.7) : alpha('#000', 0.6),
              maxHeight: 180,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {content || 'Processing...'}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
});
InlineThinkingBlock.displayName = 'InlineThinkingBlock';

/**
 * Inline Tool Block - Shows tool execution inline - OPTIMIZED
 */
export const InlineToolBlock = memo(({ tool, isFirst = false, onOpenSqlEditor }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isRunning = tool.status === 'running';
  const parsedResult = parseJSON(tool.result);
  const parsedArgs = parseJSON(tool.args);
  // Check for error using structured output format (success: false or error field)
  const isError = tool.status === 'error' || parsedResult?.success === false || parsedResult?.error;
  
  const config = TOOL_CONFIG[tool.name] || {
    action: formatToolName(tool.name),
    pastAction: formatToolName(tool.name),
    icon: CodeRoundedIcon,
  };
  
  const Icon = config.icon;
  const displayName = isRunning ? config.action : config.pastAction;

  // OPTIMIZED: Memoize color calculations - REFINED: Icons get semantic colors, UI stays subtle
  const iconColors = useMemo(() => ({
    running: theme.palette.info.main,     // Blue for processing
    success: theme.palette.success.main,  // Green for success
    error: theme.palette.error.main,      // Red for errors
  }), [theme.palette.info.main, theme.palette.success.main, theme.palette.error.main]);

  const uiColors = useMemo(() => ({
    bg: alpha(theme.palette.text.primary, isDark ? 0.04 : 0.03),
    border: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.08),
    text: theme.palette.text.primary,
  }), [theme.palette.text.primary, isDark]);

  const statusIconColor = isError ? iconColors.error : isRunning ? iconColors.running : iconColors.success;

  // OPTIMIZED: Memoize toggle handler
  const handleToggle = useCallback(() => setExpanded(prev => !prev), []);

  // OPTIMIZED: Memoize query height calculation
  const queryHeight = useMemo(() => {
    if (!parsedArgs?.query) return 60;
    return Math.min(Math.max(60, (parsedArgs.query.split('\n').length * 19) + 20), 400);
  }, [parsedArgs?.query]);

  // OPTIMIZED: Memoize filtered parameters
  const filteredParams = useMemo(() => {
    if (!parsedArgs) return [];
    return Object.entries(parsedArgs).filter(([key]) => !['query', 'rationale'].includes(key));
  }, [parsedArgs]);

  return (
    <Box sx={{ my: isFirst ? 0 : 1.5, animation: `${fadeInUp} 0.3s ease-out` }}>
      <Box
        onClick={handleToggle}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.625,
          borderRadius: 2,
          backgroundColor: uiColors.bg,
          border: `1px solid ${uiColors.border}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': { backgroundColor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.06) },
        }}
      >
        <KeyboardArrowDownIcon
          sx={{
            fontSize: 16,
            color: uiColors.text,
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }}
        />
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRunning ? (
            <AutorenewRoundedIcon sx={{ fontSize: 15, color: statusIconColor, animation: `${spin} 1s linear infinite` }} />
          ) : isError ? (
            <ErrorRoundedIcon sx={{ fontSize: 15, color: statusIconColor }} />
          ) : (
            <CheckCircleRoundedIcon sx={{ fontSize: 15, color: statusIconColor }} />
          )}
        </Box>
        <Icon sx={{ fontSize: 14, color: uiColors.text }} />
        <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 500, color: uiColors.text }}>
          {displayName}
        </Typography>
        {isRunning && <AnimatedDots />}
        {!isRunning && !expanded && parsedResult && (
          <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 0.25 }}>
            • {getResultSummary(tool.name, parsedResult)}
          </Typography>
        )}
      </Box>

      <Collapse in={expanded} timeout={200}>
        <Box sx={{ mt: 0.75, ml: 1, pl: 1.5, borderLeft: `2px solid ${uiColors.border}` }}>
          <Box sx={{ p: 1.25, borderRadius: 1.5, backgroundColor: alpha(theme.palette.text.primary, isDark ? 0.03 : 0.02) }}>
            {parsedArgs?.query && (
              <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                  Query
                </Typography>
                <Box
                  sx={{
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
                    // Flexible height: min 60px, scales with content up to 400px max
                    height: queryHeight,
                  }}
                >
                  <Editor
                    height="100%"
                    language="sql"
                    theme={isDark ? 'vs-dark' : 'light'}
                    value={parsedArgs.query}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12.5,
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                      lineNumbers: 'off',
                      folding: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      padding: { top: 10, bottom: 10 },
                      renderLineHighlight: 'none',
                      scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                      },
                      overviewRulerLanes: 0,
                      hideCursorInOverviewRuler: true,
                      overviewRulerBorder: false,
                      guides: { indentation: false },
                      contextmenu: false,
                    }}
                  />
                </Box>
              </Box>
            )}

            {filteredParams.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                  Parameters
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {filteredParams.map(([key, value]) => (
                      <Box
                        key={key}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          backgroundColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.04),
                          fontSize: '0.7rem',
                        }}
                      >
                        <span style={{ color: theme.palette.text.secondary }}>{key}:</span>
                        <span style={{ fontWeight: 500 }}>{String(value)}</span>
                      </Box>
                    ))}
                </Box>
              </Box>
            )}

            {parsedResult && !isRunning && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Result
                  </Typography>
                  {tool.name === 'execute_query' && !isError && parsedResult?.success !== false && onOpenSqlEditor && (
                    <Box
                      component="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const query = parsedArgs?.query || '';
                        const results = {
                          columns: parsedResult?.columns || [],
                          result: parsedResult?.data || [],
                          row_count: parsedResult?.row_count || 0,
                          truncated: parsedResult?.truncated || false,
                        };
                        onOpenSqlEditor(query, results);
                      }}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.625,
                        px: 1.25,
                        py: 0.5,
                        border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.3 : 0.25)}`,
                        borderRadius: 1.5,
                        backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.08),
                        color: 'primary.main',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        letterSpacing: 0.2,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.14),
                          borderColor: alpha(theme.palette.primary.main, isDark ? 0.45 : 0.35),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, isDark ? 0.25 : 0.15)}`,
                        },
                        '&:active': {
                          transform: 'translateY(0px)',
                        },
                      }}
                    >
                      <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
                      Open in Editor
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: isError ? 'error.main' : 'text.primary' }}>
                  {getDetailedResult(tool.name, parsedResult)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
});
InlineToolBlock.displayName = 'InlineToolBlock';

// Helpers
function parseJSON(str) {
  if (!str || str === 'null' || str === '{}') return null;
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch {
    return null;
  }
}

function formatToolName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getResultSummary(name, result) {
  if (!result) return '';
  if (!result.success || result.error) return 'failed';
  
  // Uses new structured output format from backend
  const summaries = {
    'get_connection_status': () => result.connected ? `${result.database || 'connected'}` : 'not connected',
    'get_database_list': () => `${result.count ?? result.databases?.length ?? 0} found`,
    'get_database_schema': () => `${result.table_count ?? result.tables?.length ?? 0} tables`,
    'get_table_columns': () => `${result.column_count ?? result.columns?.length ?? 0} columns`,
    'execute_query': () => `${result.row_count ?? 0} rows`,
    'get_recent_queries': () => `${result.count ?? 0} queries`,
    'get_sample_data': () => `${result.row_count ?? 0} rows`,
  };
  
  return summaries[name]?.() || 'done';
}

function getDetailedResult(name, result) {
  if (!result) return 'No result';
  if (!result.success || result.error) return `Error: ${result.error}`;

  // Uses new structured output format from backend
  const details = {
    'get_connection_status': () => {
      if (!result.connected) return 'Not connected to any database';
      let msg = `Connected to ${result.database || 'database'}`;
      if (result.db_type) msg += ` (${result.db_type.toUpperCase()})`;
      if (result.host) msg += ` on ${result.host}`;
      return msg;
    },
    'get_database_list': () => {
      const count = result.count ?? result.databases?.length ?? 0;
      return `Found ${count} database${count !== 1 ? 's' : ''} available`;
    },
    'get_database_schema': () => {
      const count = result.table_count ?? result.tables?.length ?? 0;
      const tables = result.tables?.slice(0, 5).join(', ') || '';
      return `Retrieved ${count} tables${tables ? `: ${tables}${count > 5 ? '...' : ''}` : ''}`;
    },
    'get_table_columns': () => {
      const count = result.column_count ?? result.columns?.length ?? 0;
      const cols = result.columns?.slice(0, 5).join(', ') || '';
      return `Table has ${count} columns${cols ? `: ${cols}${count > 5 ? '...' : ''}` : ''}`;
    },
    'execute_query': () => {
      let msg = `Query returned ${result.row_count ?? 0} rows`;
      if (result.truncated) msg += ' (truncated)';
      if (result.column_count) msg += ` with ${result.column_count} columns`;
      return msg;
    },
    'get_recent_queries': () => `Found ${result.count ?? 0} recent queries`,
    'get_sample_data': () => {
      const count = result.row_count ?? 0;
      return `Retrieved ${count} sample row${count !== 1 ? 's' : ''} from ${result.table || 'table'}`;
    },
  };

  return details[name]?.() || 'Completed successfully';
}
