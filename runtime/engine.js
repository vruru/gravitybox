/* Original runtime engine for GravityBox. Runs in an isolated CDP world; no application code is patched. */
(function bootstrapRuntime() {
  'use strict';
  const options = globalThis.__GRAVITYBOX_BOOT__;
  if (!options || location.origin !== options.origin) return;
  if (options.path === '/fixture' && location.pathname !== '/fixture') return;
  const allowedPath=location.pathname==='/'||/^\/(?:history|sidecars|customizations|automations|settings|settings-standalone|terminal-standalone|new-project|multi|artifact|s|chatski-connect)(?:\/.*)?$/i.test(location.pathname)||/^\/c(?:\/|\/(?:[0-9a-f-]{36}|_new)(?:\/.*)?)?$/i.test(location.pathname)||/^\/(?:forked|view|battle)\/.*$/i.test(location.pathname)||(options.path==='/fixture'&&location.pathname==='/fixture');
  if(!allowedPath)return;
  if(options.conservative&&/^\/(?:oauth|auth|login|sign-in)(?:\/|$)/i.test(location.pathname))return;
  // Recognize the actual system-settings shell, then admit only its content pane.
  // Project navigation, editable values, chat and code keep their existing protection.
  const SETTINGS_SCREEN_RE=/^(General|App|AppSettings|Application|Appearance|Account|Accounts|Plan|Notifications|NotificationSettings|Notification Settings|Models|ModelsAndUsage|Models & Usage|KeyboardShortcuts|Shortcuts|Customizations|Editor|Tab|Browser|Developer|Project 4K|Jetski Chat|Provide Feedback|Project General|Project Folders|Project Agent|Permissions)$/i;
  const BASE_SETTINGS_NAV_KEYS=['General','通用','App','应用','Application','App Settings','应用设置','Appearance','外观','Notifications','通知','Notification Settings','通知设置','Models','Models & Usage','模型','模型与使用量','模型与用量','驱动模型','Keyboard Shortcuts','Keyboard shortcuts','Shortcuts','快捷键','键盘快捷键','键盘快捷方式','Account','Accounts','账户','账号','Plan','计划','规划','Permissions','权限','Customizations','自定义','Editor','Editor Settings','编辑器','编辑器设置','Tab','Tab 键补全','标签页','Browser','浏览器','Developer','开发者','Provide Feedback','提供反馈'];
  const SETTINGS_NAV_SET=new Set(BASE_SETTINGS_NAV_KEYS.map(s=>s.toLowerCase()));
  const normalize = s => s.replace(/\s+/g, ' ').trim();
  const nodeSlots = new WeakMap();
  let settingsPaneCache = null;
  function settingsDialogRoot(el) {
    const root=el?.closest?.('[role="dialog"],[data-testid="settings-root"],[data-testid="settings-dialog"]');
    if(!root)return null;
    const labels=['Settings','设置',options.dictionary?.entries?.Settings].filter(Boolean);
    const hasHeader=[...root.querySelectorAll('h1')].some(e=>labels.includes(normalize(originalText(e)))||labels.includes(normalize(e.textContent||'')));
    return hasHeader?root:null;
  }
  function systemSettingsPane() {
    const query=new URL(location.href).searchParams;
    const screen=query.get('settingsScreen');
    if(screen&&!SETTINGS_SCREEN_RE.test(screen)){settingsPaneCache=null;return null;}
    const cached = settingsPaneCache;
    // React can mount before updating the URL, and retain the dialog during its exit animation.
    // A validated, connected pane remains the same scope until it is replaced or detached.
    if(cached&&cached.path===location.pathname&&(!screen||screen===cached.screen)
      &&cached.root.isConnected&&cached.pane.isConnected&&cached.heading.isConnected
      &&cached.root.contains(cached.header)&&cached.pane.contains(cached.heading)&&!cached.pane.contains(cached.header))return cached.pane;
    settingsPaneCache=null;
    const clean=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
    const rawLabel=e=>normalize(originalText(e))||clean(e);
    const isNavMatch=e=>{const raw=rawLabel(e).toLowerCase(),cur=clean(e).toLowerCase();return SETTINGS_NAV_SET.has(raw)||SETTINGS_NAV_SET.has(cur);};
    const labels=['Settings','设置',options.dictionary?.entries?.Settings].filter(Boolean);
    const selectors=labels.map(label=>'[role="dialog"][aria-label="'+CSS.escape(label)+'"]').concat('[data-testid="settings-root"]','[data-testid="settings-dialog"]');
    for(const root of document.querySelectorAll(selectors.join(','))) {
      const header=[...root.querySelectorAll('h1')].find(e=>labels.includes(rawLabel(e))||labels.includes(clean(e)));
      if(!header)continue;
      const navigationButtons=[...root.querySelectorAll('button')].filter(e=>isNavMatch(e)||(e.getAttribute('data-testid')||'').startsWith('settings-nav-item-'));
      const names=new Set(navigationButtons.map(e=>rawLabel(e).toLowerCase()));
      if(names.size<3)continue;
      const headings=[...root.querySelectorAll('h2')].filter(isNavMatch);
      const heading=headings.find(e=>e.closest('[style*="display: block"]'))||headings[0];
      if(!heading)continue;
      let pane=heading;
      while(pane.parentElement&&root.contains(pane.parentElement)&&!pane.parentElement.contains(header))pane=pane.parentElement;
      if(pane!==root&&pane.contains(heading)&&!pane.contains(header)){
        const close=root.querySelector('button[aria-label="Close"],button[aria-label="关闭"]');
        const sidebarChrome=[...root.querySelectorAll('h1,h2,button')].filter(e=>!pane.contains(e));
        settingsPaneCache={root,pane,header,heading,chrome:[...new Set([header,...navigationButtons,...sidebarChrome,...(close?[close]:[])])],path:location.pathname,screen};
        return pane;
      }
    }
    return null;
  }
  if(options.conservative&&options.path!=='/fixture'&&!options.shellValidated){
    const ready=()=>!!document.body&&(!!systemSettingsPane()||(!!document.querySelector('[aria-label*="Sidebar" i],[aria-label*="侧边栏"],[data-testid*="sidebar" i],[data-testid="agent-input-box"]')&&!!document.querySelector('[data-testid="model-selector-trigger"],a[href="/history"],a[href="/customizations"],[data-testid="agent-input-box"],textarea,input'))||(/^\/(?:settings(?:\/[^?#]*)?|settings-standalone)$/.test(location.pathname)&&!!document.querySelector('[role="dialog"][aria-label="Settings"],[role="dialog"][aria-label="设置"],[data-testid*="settings"]')&&!!document.querySelector('[role="tablist"],nav,[role="navigation"]'))||(location.pathname==='/terminal-standalone'&&!!document.querySelector('.xterm,.monaco-editor,[data-testid*="terminal"]')));
    if(!ready()){
      globalThis.__GRAVITYBOX_PENDING_BOOT__?.cancel();let stopped=false;const watcher=new MutationObserver(()=>{if(!stopped&&ready()){cancel();options.shellValidated=true;bootstrapRuntime();}});const timeout=setTimeout(()=>cancel(),5000);
      function cancel(){stopped=true;watcher.disconnect();clearTimeout(timeout);delete globalThis.__GRAVITYBOX_PENDING_BOOT__;}
      globalThis.__GRAVITYBOX_PENDING_BOOT__={cancel};watcher.observe(document,{childList:true,subtree:true});return;
    }options.shellValidated=true;
  }

  const KEY = '__GRAVITYBOX_ENGINE_V1__';
  function reportWindowFocus() {
    try {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (typeof globalThis.__gravityboxWindowFocus === 'function') {
        globalThis.__gravityboxWindowFocus(String(Date.now()));
      }
    } catch {}
  }
  function handleVisibilityFocus() {
    if (typeof document === 'undefined' || !document.hidden) reportWindowFocus();
  }
  function installFocusListeners() {
    if (typeof window !== 'undefined') window.addEventListener('focus', reportWindowFocus, true);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityFocus, true);
  }
  function removeFocusListeners() {
    if (typeof window !== 'undefined') window.removeEventListener('focus', reportWindowFocus, true);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityFocus, true);
  }
  if (options.translationEnabled === false) {
    if (globalThis[KEY]) {
      if (globalThis[KEY].state?.()?.runtimeId === options.runtimeId && globalThis[KEY].getLanguageMode?.() === 'en') {
        globalThis[KEY].update?.(options.dictionary);
        globalThis.__GRAVITYBOX_ATTACH_HUD__?.();
        return;
      }
      try { globalThis[KEY].dispose?.({ keepHud: true }); } catch {}
    }
    installFocusListeners();
    // HUD-only connection: expose the lifecycle contract without installing
    // translators, project markers, mutation observers or scan collectors.
    let dictionary = options.dictionary;
    const state = () => ({ active: true, version: dictionary.version, runtimeId: options.runtimeId,
      languageMode: 'en', pending: 0, scanCount: 0, translatedNodes: 0 });
    globalThis[KEY] = {
      state, getLanguageMode: () => 'en', refresh() {},
      update(next) { dictionary = next; }, setShortcutEnabled() {},
      dispose(opts) {
        removeFocusListeners();
        if (!opts?.keepHud) { try { globalThis.__GRAVITYBOX_HUD_V1__?.dispose?.(); } catch {} }
        delete globalThis[KEY];
        if (globalThis.__GRAVITYBOX_BOOT__ === options) delete globalThis.__GRAVITYBOX_BOOT__;
        return { restored: 0, skipped: 0, active: false };
      },
    };
    globalThis.__GRAVITYBOX_ATTACH_HUD__?.();
    return;
  }
  if (globalThis[KEY]) { globalThis[KEY].setShortcutEnabled?.(options.shortcutEnabled !== false); globalThis[KEY].update(options.dictionary); return; }
  installFocusListeners();
  let shortcutEnabled = options.path === '/fixture' && options.shortcutEnabled !== false;
  const ownedProjectMarkers = new Set();
  const UI = '[data-gravitybox-ui],button,a[href],h1,h2,h3,h4,[role="navigation"],[role="button"],[role="menuitem"],[role="tab"],[role="option"],[role="tooltip"],[role="dialog"],[role="status"],[role="alert"],[role="banner"],label,th,td,summary,figcaption,.monaco-menu-item,[data-sonner-toast],[data-testid="toast-notification"],[data-testid="ssh-connect-progress"],[data-testid="ssh-connect-error"],[data-testid="ssh-config-file"],[data-testid="ssh-machine-switcher-status"],[role="listitem"],[role="region"],[data-testid*="settings"],[data-testid*="preferences"],[data-testid*="empty"],[data-testid*="notice"],[data-testid*="banner"],[data-testid*="card"],[data-testid*="header"],[data-testid*="sidecar"],[data-testid*="trigger"],[data-testid="agent-input-box"],[contenteditable="true"][role="combobox"]+p,[data-testid="cascade-system-message-toolbar"],[data-testid="turn-cards-container"],[data-testid="side-question-followup-thinking"],[data-select-popup],[role="menu"],[role="listbox"]';
  const UI_SELECTOR = 'button, [role="button"], [role="tab"], [role="menuitem"], [role="tooltip"], [role="option"], label, option, th, td, summary, figcaption, .monaco-menu-item, [data-sonner-toast], [role="listitem"], [role="region"], h1, h2, h3, h4, [data-select-popup], [role="menu"], [role="listbox"]';
  /* PROTECTED keeps user content, code and editors in English. `[data-testid="conversation-row-sidebar"]`
     is the container the app really uses for the conversation list: its title <span> is NOT inside
     `a[href^="/c/"]`, so relying on the anchor alone left conversation titles translatable. */
  const PROTECTED_CORE = 'script,style,code,pre,input,textarea,svg,canvas,.file-tree,[data-message-id],[contenteditable]:not([contenteditable="false"]),[data-gravitybox-protect],[data-message-author-role],[data-testid*="message"]:not([data-testid="cascade-system-message-toolbar"]),[data-testid*="conversation-title"],[data-testid="conversation-row-sidebar"],[data-testid*="conversation-row"],[data-testid*="artifact"]:not([data-testid^="shortcut-row-"]),[data-testid="planner-response-text"],[data-testid="user-input-step"],[data-testid="breadcrumb-segment"],[data-testid="project-header"],[data-testid="project-selector-trigger"],a[href^="/c/"],a[href*="/c/"],.monaco-editor,.xterm,.markdown,.markdown-frontmatter,.markdown-alert-title,.notebook-markdown-cell,.prose,[role="log"],.chat-message,.message-content,.conversation-title,.terminal,.output-view,.debug-console,.code-view,.artifact-container,.model-item,.gravitybox-project-name,[data-testid*="attachment"],[data-testid*="file-chip"],[data-testid*="context-chip"],[data-testid="side-question-followup-user"],[data-testid="voice-transcript-summary"],[data-testid="coordinator-card-latest-line"],[data-testid="coordinator-worker-card"] .truncate';
  const PROTECTED = PROTECTED_CORE + ',[data-testid*="model"]:not([data-testid^="shortcut-row-"])';
  const SETTINGS_MODEL_PROTECTED = '[data-testid*="model-selector"],[data-testid*="model-picker"],[data-testid*="model-option"],[data-testid*="model-item"],[data-testid*="model-name"],[data-testid*="custom-model"]';
  const SETTINGS_MODEL_WIDGET = '[role="combobox"],[aria-haspopup],[role="menu"],[role="listbox"],[role="option"]';
  /* J01 positive user-content contract. A container marked `data-gravitybox-user-content` or an element
     marked `data-gravitybox-user-name` is user-authored text: never translated, never collected. On top
     of the explicit contract (usable by adapters and tests) entity surfaces are recognised
     structurally so user names stay English even on unmarked builds: links to a plugin/skill/
     session/automation detail page carry the entity name, and a heading / name field / list row /
     option row that belongs to an entity card is a name, not interface copy. Genuine controls
     (buttons, tabs, command menus) remain translatable: a `[role="menuitem"]` only counts as a name
     inside an entity container or a row with per-item actions. */
  const USER_CONTENT = '[data-gravitybox-user-content],[data-gravitybox-user-name]';
  const ENTITY_HREF = /^\/(?:c(?:\/|\/(?:[0-9a-f-]{36}|_new)(?:\/.*)?)?|customizations\/(?:plugins|skills|automations|sidecars)\/[\w.-]+|(?:customizations\/)?marketplaces\/[\w.-]+\/(?:plugins|skills|bundles)\/[\w.-]+|automations\/[\w.-]+|projects\/[\w.-]+|sidecars\/(?:triggers\/)?[\w.-]+)$/i;
  const ENTITY_CONTAINER = '[data-gravitybox-user-content],[data-testid="automation-card"],[data-testid="automation-row"],[data-testid="automation-item"],[data-testid="automation-list-item"],[data-testid*="workspace"],[data-testid*="project"],[data-testid*="skill"],[data-testid*="plugin"],[data-testid*="marketplace"],[data-testid*="session"]';
  const ENTITY_ROW = '[data-testid*="card"],[data-testid*="row"],li,[role="listitem"],[role="option"],[role="menuitem"],tr';
  const ROW_ACTIONS = '[data-testid*="actions"],[data-testid*="menu-trigger"],[aria-label*="More actions" i],[aria-label*="更多操作"],[aria-label="More options" i]';
  const USER_NAME_ROW = 'h1,h2,h3,h4,[data-testid*="name"],[data-testid*="title"]';
  const USER_NAME_LEAF = '[role="listitem"],[role="option"]';
  function entityAnchorPath(anchor) {
    try { const url = new URL(anchor.getAttribute('href') || '', location.href); return url.origin === location.origin ? url.pathname : ''; } catch { return ''; }
  }
  function userNamed(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (element.closest('[data-testid*="-toggle"],[data-testid*="-trigger"],[data-testid$="-button"],[data-testid$="-select"],[data-testid="ssh-config-file"],[data-testid="ssh-connect-progress"],[data-testid="ssh-connect-error"]')) return false;
    if (element.closest(USER_CONTENT)) return true;
    const anchor = element.closest('a[href]');
    if (anchor && ENTITY_HREF.test(entityAnchorPath(anchor))) return true;
    if (element.closest('[data-testid^="conversation-copy-"]')) return false;
    if (element.matches(USER_NAME_ROW)) {
      const row = element.closest(ENTITY_ROW);
      if (row && !row.matches('[data-testid^="conversation-copy-"]') && (row.querySelector(ROW_ACTIONS) || (matches(row, ENTITY_CONTAINER) && !row.closest('[role="menu"]')) || row.closest(ENTITY_CONTAINER))) return true;
    }
    const leaf = element.closest(USER_NAME_LEAF);
    if (leaf && !element.closest('button,[role="button"],a[href],label,[role="menuitem"]')) {
      /* A list row is data (user name); an option row is only a name inside an entity picker or a
         plain listbox. Options of a command menu (model picker, slash commands) are interface
         labels and stay translatable, which is what keeps real menus from being frozen. */
      if (leaf.matches('[role="option"]')) return Boolean(leaf.closest(ENTITY_CONTAINER));
      return true;
    }
    return false;
  }
  /* J03: third-party/product names are not interface copy. Entity links/cards are protected
     structurally (J01); this allowlist covers brand-only labels rendered as plain text/buttons so a
     dictionary hit can never turn "Gemini"/"GitHub" into Chinese. */
  const BRAND_NAMES = new Set(['antigravity', 'gravitybox', 'gemini', 'claude', 'gpt', 'chatgpt', 'google', 'google chat', 'github', 'github copilot', 'copilot', 'chrome', 'chromium', 'firefox', 'safari', 'webkit', 'node.js', 'nodejs', 'npm', 'pnpm', 'yarn', 'deno', 'bun', 'electron', 'typescript', 'javascript', 'python', 'rust', 'golang', 'java', 'kotlin', 'swift', 'xcode', 'vscode', 'vs code', 'visual studio code', 'intellij idea', 'pycharm', 'webstorm', 'jetbrains', 'docker', 'kubernetes', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'mongodb', 'react', 'vue', 'svelte', 'angular', 'next.js', 'vite', 'webpack', 'esbuild', 'tailwind', 'tailwind css', 'openai', 'anthropic', 'deepseek', 'mistral', 'llama', 'perplexity', 'notion', 'slack', 'linear', 'jira', 'figma', 'gitlab', 'bitbucket', 'vercel', 'cloudflare', 'firebase', 'supabase', 'prisma', 'playwright', 'puppeteer', 'xterm', 'monaco', 'markdown', 'latex', 'mermaid', 'git', 'mcp', 'oauth', 'jetski', 'sidecar', 'flutter', 'dart', 'agy', 'inter', 'google sans', 'google sans code', 'google sans text', 'jetbrains mono', 'fira code', 'fira mono', 'cascadia code', 'cascadia mono', 'sf mono', 'roboto mono', 'source code pro', 'consolas', 'menlo', 'courier new', 'ubuntu mono', 'inconsolata', 'hack', 'catppuccin', 'catppuccin frappe', 'catppuccin latte', 'catppuccin macchiato', 'catppuccin mocha', 'gruvbox', 'gruvbox material', 'gruvbox dark', 'gruvbox light', 'solarized', 'solarized light', 'solarized dark', 'one light', 'one dark', 'one dark pro', 'dracula', 'nord', 'monokai', 'monokai pro', 'monokai dimmed', 'tokyo night', 'ayu', 'ayu dark', 'ayu light', 'ayu mirage', 'quiet light', 'aoede', 'arlo', 'charon', 'cleo', 'fenrir', 'finn', 'fola', 'gero', 'kore', 'leda', 'lora', 'neno', 'olin', 'orus', 'puck', 'tari', 'zephyr', 'project 4k', 'workspace_1', 'workspace_2', 'workspace_3']);
  function isBrandName(value) { return BRAND_NAMES.has(lower(normalize(value))); }
  /* J04 disclosure: templates only understand {0}/{1}… placeholders. printf-style (%s/%d/…) and
     ICU plural/select messages are not recognised (the runtime substitutes the number before the
     engine can match), so callers/UI can state that explicitly instead of silently missing them. */
  const TEMPLATE_CAPABILITIES = {
    schema: 1,
    placeholders: {
      supported: ['{N}'],
      inlineGroup: {
        supported: 'same placeholder order, every non-empty translated run has an existing text slot (safe in-place mapping; links keep their visible text and interaction)',
        unsupported: 'placeholder reorder, placeholder set mismatch, or a non-empty run without a DOM text slot: the complete English sentence is kept (never partially translated, links/buttons are never cleared) and reported as unsupported/review for an in-order dictionary translation',
        collection: 'unsupported/ungrouped inline sentences are still collected as one whole-sentence key'
      }
    },
    unsupported: ['%s', '%d', '%i', '%u', 'icu-plural', 'inline-group-placeholder-reorder', 'inline-group-missing-slot'],
    note: '仅识别 {0}/{1}… 内联占位符。%s/%d 等 printf 占位与 ICU plural/select 文案不会被模板翻译（运行时数字无法匹配）；内联句只应用“顺序一致且每个非空译文段都有现成文本槽”的译文，重排/缺槽/占位符不一致时保留完整英文并标记 unsupported，需在词典中按原占位顺序提供译文。'
  };
  const FORMAT_WARNING = '占位符仅支持 {N}；%s/%d 与 ICU plural 不会被模板翻译';
  function formatWarningFor(text) {
    return (/%[sdifu]/.test(text) || /\{[A-Za-z_][\w]*\s*,\s*(?:plural|select|selectordinal|number|date|time)\s*,/.test(text)) ? FORMAT_WARNING : undefined;
  }
  const TRANSLATABLE_ATTRS = ['title', 'aria-label', 'data-tooltip', 'placeholder'];
  const QUEUE_LIMIT = 50000;
  const activeNodes = new Set();
  const observed = new Set();
  const inlineGroups = new WeakMap();
  const inlineGroupInlineElements = new WeakMap();
  const inlineGroupContainers = new Set();
  /* J04 conservative correction: templates whose translation cannot be laid out losslessly keep the
     complete English sentence and are reported (one whole-sentence candidate + layoutWarning). */
  const unsupportedInlineGroupReasons = new WeakMap();
  const unsupportedInlineGroupSet = new Set();
  const INLINE_LAYOUT_WARNING = '内联占位符无法安全映射（语序重排/缺少对应文本槽/占位符集合不一致）：已保留完整英文，请在词典中按原占位顺序提供译文';
  const lower = s => s.toLowerCase();
  const foldKey = s => lower(s).replace(/[\u2018\u2019]/g, "'");
  let auditKeys = null, auditExpires = 0;
  const auditTrail = new Map();
  function visibleUi(el) {
    if (!el?.getClientRects().length) return false;
    const rect=el.getBoundingClientRect();
    return rect.bottom>0 && rect.right>0 && rect.top<innerHeight && rect.left<innerWidth && getComputedStyle(el).visibility!=='hidden';
  }
  function auditRecord(original, current, el, kind, matches=[]) {
    if (!auditKeys || Date.now() > auditExpires) { auditKeys = null; return; }
    if(auditTrail.size>=5000||!visibleUi(el))return;
    const candidates=matches.length?matches:[original];
    const route=scopeRoute(el);
    for(const item of candidates){const key=auditKeys.get(normalize(item));if(!key)continue;const state=languageMode==='zh'&&normalize(current)!==normalize(original)?'verified':'untranslated';auditTrail.set(route+'\n'+key,{route,key,state,kind});}
  }

  function inferKind(el) {
    if (!el || typeof el.closest !== 'function') return 'label';
    if (el.closest('button, [role="button"]')) return 'button';
    if (el.closest('[role="tab"]')) return 'tab';
    if (el.closest('[role="menuitem"], .monaco-menu-item')) return 'menuitem';
    if (el.closest('[role="tooltip"], [data-tooltip], [title]')) return 'tooltip';
    if (el.closest('h1, h2, h3, h4, h5, h6')) return 'heading';
    if (el.closest('label')) return 'label';
    if (el.closest('[role="option"], option')) return 'option';
    if (el.closest('[data-sonner-toast], [role="alert"], [role="status"]')) return 'toast';
    return 'label';
  }

  function isValidUiText(raw) {
    if (!raw || typeof raw !== 'string') return false;
    const text = normalize(raw);
    if (text.length < 2 || text.length > 400) return false;
    if (!/[a-zA-Z]{2,}/.test(text)) return false;
    if (/[\u3400-\u9fff]/.test(text)) return false;
    if (/(?:https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:^|\s)(?:\/|~\/|[A-Za-z]:\\)|\b(?:sk-|AIza)[A-Za-z0-9_-]{12,})/.test(text)) return false;
    if (/^\d+[\w\s.-]*$/.test(text)) return false;
    if (/\[(?:calc|\d+|min|max|var|rgba?)[^\]]*\]/.test(text)) return false;
    if (/^\d+px\s+solid/i.test(text) || /^rgba?\(/i.test(text) || /cubic-bezier/i.test(text)) return false;
    if (/^system-ui,|^ui-monospace,/.test(text) || /^translate[XY]\(/.test(text)) return false;
    if (/^(?:grid-rows-|opacity-|scale-|max-h-|max-w-|min-w-|h-|w-|p-|bg-|border)/.test(text) && /-|:/.test(text)) return false;
    if (/^EDITION_\d+_TEST_ONLY$/.test(text) || /^Optional(?:Double|Int)?\.empty\(\)$/.test(text)) return false;
    if (/^(?:Alt|Ctrl|Cmd|Command|Option|Shift)\+[\w.]+$/i.test(text)) return false;
    if (/^[a-z-]+(?::[a-z-]+)*\s+[a-z-]+/.test(text) && /-|:/.test(text)) return false;
    return true;
  }
  /* J04: whole-sentence keys from inline groups are longer than a label and legitimately contain
     {N} placeholders; they still must not carry URLs/emails/paths/secrets or Chinese. */
  function isValidTemplateText(raw) {
    if (!raw || typeof raw !== 'string') return false;
    const text = normalize(raw);
    if (text.length < 4 || text.length > 400) return false;
    if (!/[a-zA-Z]{2,}/.test(text)) return false;
    if (/[\u3400-\u9fff]/.test(text)) return false;
    if (/(?:https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:^|\s)(?:\/|~\/|[A-Za-z]:\\)|\b(?:sk-|AIza)[A-Za-z0-9_-]{12,})/.test(text)) return false;
    return true;
  }

  let dictionary = options.dictionary;
  let foldedMap = new Map();
  let languageMode = options.translationEnabled === false ? 'en' : 'zh'; // 'zh' | 'en'
  let active = true;
  let observer;
  let timer = null;
  let scanning = false;

  let lastMatchedKeys=[];
  const conservative=!!options.conservative;
  const restrictedAdaptiveRoute=()=>false;
  const scopeRoute=(el)=>{if(inSystemSettings(el,scanCount))return '/settings';const panel=el?.closest('[role="dialog"],[data-testid*="settings"],[data-testid*="preferences"]');if(panel&&((panel.getAttribute('data-testid')||'').match(/settings|preferences/)||/^(Settings|设置)$/i.test(panel.getAttribute('aria-label')||'')||/^(Settings|设置)$/.test(panel.querySelector('h1,[role="heading"]')?.textContent?.trim()??'')))return '/settings';return location.pathname==='/fixture'?'/fixture':/^\/customizations(?:\/installed)?$/.test(location.pathname)?location.pathname:location.pathname.startsWith('/settings')?'/settings':location.pathname.startsWith('/automations')?'/automations':location.pathname.startsWith('/sidecars')?'/sidecars':['/','/history'].includes(location.pathname)?location.pathname:'/other';};
  const scopeKey=(key,kind,route=scopeRoute())=>`@ui:${route}|${kind}|${key}`;
  /* J02 SPA route guard. The bootstrap allow-list above is evaluated once per document, but the app
     is a SPA: in-app navigation keeps the same document and the same injected engine, so an
     out-of-list route (onboarding/oauth/login/unknown) used to keep receiving translations. The
     guard re-checks the same allow-list on popstate/hashchange, before every flush, on update()
     (the controller calls it after navigatedWithinDocument) and by a light poll. Outside the list
     the engine suspends, restores every translation it owns to English and drops its queue; when
     the route comes back the document is rescanned and Chinese is re-applied. */
  const ALLOWED_ROUTE = /^(?:\/|\/(?:history|sidecars|customizations|automations|settings|settings-standalone|terminal-standalone|new-project|multi|artifact|s|chatski-connect)(?:\/.*)?|\/c(?:\/|\/(?:[0-9a-f-]{36}|_new)(?:\/.*)?)?|\/(?:forked|view|battle)\/.*)$/i;
  const RESTRICTED_ROUTE = /^\/(?:onboarding|oauth|auth|login|sign-in)(?:\/|$)/i;
  let routeExcluded = false;
  let routeTimer = null;
  function routeAllowedNow() {
    if (options.path === '/fixture') return location.pathname === '/fixture';
    if (RESTRICTED_ROUTE.test(location.pathname)) return false;
    return ALLOWED_ROUTE.test(location.pathname);
  }
  function restoreAllSlots() {
    /* A fresh scan token invalidates the per-scan eligible/blocked caches; reusing the current
       scanCount would read a stale "eligible" entry and leave the Chinese text in place. */
    const scan = ++scanCount;
    for (const node of activeNodes) {
      if (!node.isConnected) { activeNodes.delete(node); continue; }
      const slots = nodeSlots.get(node);
      if (!slots?.size) { activeNodes.delete(node); continue; }
      for (const attr of [...slots.keys()]) updateValue(node, attr, scan);
    }
  }
  function applyRouteGuard(force = false) {
    const excluded = !routeAllowedNow();
    if (excluded === routeExcluded && !force) return routeExcluded;
    routeExcluded = excluded;
    try { globalThis.__GRAVITYBOX_HUD_V1__?.setRouteExcluded?.(routeExcluded); } catch {}
    if (excluded) {
      pluginCards = []; pluginCardsAt = -1;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      pending.clear(); waiting.clear(); settingsWaiting.clear(); requeueDocument = false; reconcileRequested = false; reconcileQueue = null;
      /* updateValue() is the single place that knows how to put a slot back to English and drop it;
         reusing it here keeps suspension and restoration in agreement (no stale slot afterwards). */
      restoreAllSlots();
    } else {
      requeueDocument = true;
      schedule(document);
    }
    return routeExcluded;
  }
  function checkRoute() { if (active) applyRouteGuard(false); }
  routeExcluded = !routeAllowedNow();
  let pluginCardsAt=-1,pluginCards=[];
  function pluginCardRoots(){
    if(!/^\/customizations(?:\/installed)?$/.test(location.pathname)){pluginCards=[];pluginCardsAt=-1;return [];}
    if(pluginCardsAt===scanCount)return pluginCards;pluginCardsAt=scanCount;pluginCards=[];
    const pluginLink=a=>{try{const u=new URL(a.href,location.href);return u.origin===location.origin&&/^\/customizations\/(?:plugins\/[\w.-]+|marketplaces\/[\w.-]+\/plugins\/[\w.-]+)$/.test(u.pathname);}catch{return false;}};
    for(const anchor of [...document.querySelectorAll('a[href]')].filter(pluginLink)){
      let card=anchor.parentElement;
      for(let i=0;i<7&&card;i++,card=card.parentElement){
        if(['BODY','HTML','MAIN'].includes(card.tagName))break;
        const links=[...card.querySelectorAll('a[href]')].filter(pluginLink);if(links.length!==1)break;
        if(card.querySelector('input,textarea,[contenteditable="true"],pre,code'))break;
        if(!card.querySelector('button,[role="button"]'))continue;
        const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);let description=false,count=0;
        while(walker.nextNode()&&++count<300){const n=walker.currentNode;if(n.parentElement.closest('a,button,[role="button"],svg,script,style'))continue;const text=normalize(n.nodeValue);if(text&&!['Official','官方','Installed','已安装','New','新','Notice','说明','Preview','预览','Beta'].includes(text)){description=true;break;}}
        if(description){pluginCards.push({card,anchor});break;}
      }
    }return pluginCards;
  }
  function pluginDescription(el){return !!el&&!el.closest('a,button,[role="button"]')&&pluginCardRoots().some(({card})=>card.contains(el));}
  /* Entity names are never translated, but a build that translated them before this guard existed
     can still hold Chinese slots; report the recorded original so plugin metadata stays stable. */
  function originalText(element) {
    let out = '';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const node = walker.currentNode; out += nodeSlots.get(node)?.get('')?.original ?? node.nodeValue ?? ''; }
    return out;
  }
  function pluginCatalog(){
    if(routeExcluded||restrictedAdaptiveRoute())return [];
    const entries=[];
    for(const {card,anchor} of pluginCardRoots()){
      if(blocked(card,scanCount))continue;const parts=[],walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);let count=0;
      while(walker.nextNode()&&++count<300){const n=walker.currentNode;if(n.parentElement.closest('a,button,[role="button"],svg,script,style')||blocked(n.parentElement,scanCount))continue;const text=normalize(nodeSlots.get(n)?.get('')?.original??n.nodeValue);if(text&&!['Official','官方','Installed','已安装','New','新','Notice','说明','Preview','预览','Beta'].includes(text))parts.push(text);}
      const u=new URL(anchor.href,location.href);
      const labelAttr=anchor.getAttribute('aria-label');
      const labelOriginal=normalize(nodeSlots.get(anchor)?.get('aria-label')?.original ?? labelAttr ?? originalText(anchor));
      for(const description of new Set(parts)){entries.push({id:u.pathname.split('/').at(-1),name:labelOriginal.slice(0,160),description:description.slice(0,2000),truncated:description.length>2000,source:location.pathname.endsWith('/installed')?'installed-view':'marketplace-view'});if(entries.length>=250)break;}
      if(entries.length>=250)break;
    }return entries;
  }
  let customTemplateRules = [];
  function isRepeatableBraceQuantifier(tail) {
    const m = tail.match(/^\{(\d+)(?:,(\d*))?\}/);
    if (!m) return false;
    if (m[2] === undefined) return Number(m[1]) >= 2;
    if (m[2] === '') return true;
    return Number(m[2]) >= 2;
  }
  function hasNestedQuantifiedGroup(pattern) {
    const groupHasQuantifier = [];
    let inCharClass = false;
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '[') { inCharClass = true; continue; }
      if (ch === ']' && inCharClass) { inCharClass = false; continue; }
      if (inCharClass) continue;
      if (ch === '(') {
        groupHasQuantifier.push(false);
      } else if (ch === ')') {
        const innerQuantified = groupHasQuantifier.pop() ?? false;
        const next = pattern[i + 1] ?? '';
        const outerRepeats =
          next === '+' ||
          next === '*' ||
          (next === '{' && isRepeatableBraceQuantifier(pattern.slice(i + 1)));
        const outerOptional = next === '?';
        if (innerQuantified && (outerRepeats || outerOptional)) return true;
        if ((innerQuantified || outerRepeats) && groupHasQuantifier.length > 0) {
          groupHasQuantifier[groupHasQuantifier.length - 1] = true;
        }
      } else if (
        (ch === '+' || ch === '*' || (ch === '{' && isRepeatableBraceQuantifier(pattern.slice(i))))
        && groupHasQuantifier.length > 0
      ) {
        groupHasQuantifier[groupHasQuantifier.length - 1] = true;
      }
    }
    return false;
  }
  function compileDeclarativeTemplateRules(rawRules) {
    if (!Array.isArray(rawRules) || rawRules.length === 0) return [];
    const compiled = [];
    for (const item of rawRules) {
      if (!item || typeof item !== 'object') continue;
      const key = typeof item.key === 'string' ? item.key.trim() : '';
      const patternSrc = typeof item.pattern === 'string' ? item.pattern : '';
      const flags = typeof item.flags === 'string' ? item.flags : 'i';
      const replacement = typeof item.replacement === 'string' ? item.replacement : '';
      if (!key || key.length > 240 || !patternSrc || patternSrc.length > 320 || !patternSrc.startsWith('^') || !replacement || replacement.length > 400) continue;
      if (!/^[iu]*$/.test(flags)) continue;
      if (hasNestedQuantifiedGroup(patternSrc) || /(\([^)]*[+*][^)]*\))[+*?]/.test(patternSrc)) continue;
      try {
        const pattern = new RegExp(patternSrc, flags);
        compiled.push({
          key,
          pattern,
          inlineOnly: item.inlineOnly === true || /\{\d+\}/.test(key),
          replace: (...args) => {
            const groups = args.slice(1, -2);
            return replacement.replace(/\$([1-9]\d?|\$)/g, (_, token) => {
              if (token === '$') return '$';
              const idx = Number(token) - 1;
              return groups[idx] !== undefined ? String(groups[idx]) : '';
            });
          },
        });
        if (compiled.length >= 256) break;
      } catch {}
    }
    return compiled;
  }
  function rebuildIndex(dict) {
    dictionary = dict;
    foldedMap = new Map();
    customTemplateRules = compileDeclarativeTemplateRules(dict?.templateRules);
    if (!dict?.entries) return;
    for (const [k, v] of Object.entries(dict.entries)) {
      if(k.startsWith('@ui:'))continue;
      const f = foldKey(k);
      if (!foldedMap.has(f)) foldedMap.set(f, v);
    }
  }
  rebuildIndex(options.dictionary);

  function injectMicroPatch() {
    try {
      if (typeof document === 'undefined' || document.getElementById('__gravitybox_micro_patch__')) return;
      const target = document.head || document.documentElement;
      if (!target) return;
      const style = document.createElement('style');
      style.id = '__gravitybox_micro_patch__';
      style.textContent = `
        button[data-gravitybox-loc="1"], [role="button"][data-gravitybox-loc="1"], [role="tab"][data-gravitybox-loc="1"],
        button[data-gravitybox-ui], [role="button"][data-gravitybox-ui], [role="tab"][data-gravitybox-ui] {
          white-space: nowrap;
        }
        p[data-gravitybox-loc="1"], .description[data-gravitybox-loc="1"],
        p[data-gravitybox-ui], .description[data-gravitybox-ui] {
          line-height: 1.5;
        }
      `;
      target.appendChild(style);
    } catch {}
  }
  injectMicroPatch();
  /* A Set keeps one entry per node, so repeated notifications for the same element (or an
     element already queued through an ancestor) are free. An array let the same subtree be
     re-expanded once per duplicate, which grew without bound under sustained mutations. */
  const waiting = new Set();
  const settingsWaiting = new Set();
  let requeueDocument = false;
  let dictionaryToastPending = false;
  let dictionaryToastLastAt = -Infinity;
  let reconcileRequested = false;
  let queueTrimmed = false;
  let droppedBatches = 0;
  let skippedRestores = 0;
  let scanCount = 0;
  let maxSliceMs = 0;
  let lastCollectionTruncated = false;
  const pending = new Set();
  let projectNames = new Set();
  let projectSnapshotAt = -1;
  let projectQueryAt = -Infinity;
  let projectSearchDirty = true;

  function ancestors(element) {
    const result = [];
    while (element) {
      result.push(element);
      element = element.parentElement || (element.getRootNode()?.host ?? null);
    }
    return result;
  }
  function matches(element, selector) { try { return element.matches(selector); } catch { return false; } }
  /* J08: protection-state fingerprint per element. Presentational class churn (hover/active/
     animation utilities) keeps the token unchanged, so the observer can drop those mutations
     entirely instead of scheduling a subtree rescan and a recorded-node reconcile. Only state that
     can flip "translatable <-> protected" (protection-relevant classes, role, contenteditable,
     protection markers, data-testid) invalidates the element, and therefore its recorded subtree. */
  const protectionTokens = new WeakMap();
  const PROTECTIVE_CLASSES = new Set(['chat-message', 'message-content', 'conversation-title', 'terminal', 'output-view', 'debug-console', 'code-view', 'artifact-container', 'model-item', 'markdown', 'markdown-frontmatter', 'markdown-alert-title', 'notebook-markdown-cell', 'prose', 'file-tree', 'monaco-editor', 'xterm', 'gravitybox-project-name']);
  const PROTECTION_ATTRS = ['class', 'role', 'contenteditable', 'data-testid', 'data-gravitybox-protect', 'data-gravitybox-user-content', 'data-gravitybox-user-name', 'data-message-id', 'data-message-author-role', 'href'];
  const PROTECTION_ATTR_SET = new Set(PROTECTION_ATTRS);
  const OBSERVER_ATTR_FILTER = [...TRANSLATABLE_ATTRS, ...PROTECTION_ATTRS];
  function isProtectedHref(el) {
    if (!el || el.tagName !== 'A') return '';
    const href = el.getAttribute('href') || '';
    if (!href) return '';
    if (href.startsWith('/c/') || href.includes('/c/') || ENTITY_HREF.test(entityAnchorPath(el))) return '1';
    return '';
  }
  function protectionToken(el) {
    const raw = typeof el.className === 'string' ? el.className : '';
    let protective = '';
    for (const token of raw.split(/\s+/)) if (token && PROTECTIVE_CLASSES.has(token)) protective += token + ' ';
    return protective + '|' + (el.getAttribute('role') || '') + '|' + (el.getAttribute('contenteditable') || '') +
      '|' + (el.hasAttribute('data-gravitybox-protect') ? 'p' : '') + (el.hasAttribute('data-gravitybox-user-content') ? 'u' : '') + (el.hasAttribute('data-gravitybox-user-name') ? 'n' : '') +
      '|' + (el.hasAttribute('data-message-id') ? 'm' : '') + (el.hasAttribute('data-message-author-role') ? 'a' : '') +
      '|' + isProtectedHref(el) +
      '|' + (el.getAttribute('data-testid') || '');
  }
  function protectionChanged(el) {
    const token = protectionToken(el);
    const previous = protectionTokens.get(el);
    protectionTokens.set(el, token);
    return previous !== token;
  }
  /* Project names are not fixed at load time: projects can be created, renamed or rendered
     after the engine starts. Re-snapshot whenever the DOM changed since the last evaluation. */
  function refreshProjectNames(scan) {
    if (projectSnapshotAt === scan) return;
    const now = performance.now();
    /* The header lookup is a whole-document query and project names only gate dialog-button
       protection. Refresh when the header subtree actually changed, at most once per 750ms, plus a
       slow heartbeat so renames are still observed without querying on every streamed token. */
    if (projectSearchDirty) { if (now - projectQueryAt < 750) return; }
    else if (now - projectQueryAt < 5000) { projectSnapshotAt = scan; return; }
    projectSnapshotAt = scan; projectQueryAt = now; projectSearchDirty = false;
    const next = new Set();
    for (const node of document.querySelectorAll('[data-testid="project-header"]')) {
      const name = normalize(node.textContent || '');
      if (!name) continue;
      next.add(name);
      /* Tag the button that carries a project name so later mutation/removal is noticed even
         after the header itself is gone; the class is also part of PROTECTED. Guard the write:
         classList.add on an element that already has the class is a no-op, but an unconditional
         write produced a mutation on every scan and drove the flush timer into a busy loop. */
      if (matches(node, 'button,[role="button"]') && !node.classList.contains('gravitybox-project-name')) { node.classList.add('gravitybox-project-name'); ownedProjectMarkers.add(new WeakRef(node)); }
    }
    projectNames = next;
  }
  const blockedCache = new WeakMap();
  const eligibleCache = new WeakMap();

  const MODEL_LABELS = new Set(['Model', 'Usage', 'View Usage', 'Weekly limit', 'Daily limit', 'Weekly Limit Remaining', 'Five Hour Limit Remaining', 'Gemini Models', 'Claude and GPT models', 'Gemini 4 Argon', 'Gemini 4 Argon Weekly Limit', 'Gemini 4 Carbon', 'Gemini 4 Carbon Weekly Limit', 'New', 'Notice', 'Unavailable', 'Refreshing...', 'No quota information available.', '% left']);
  const MODEL_GROUP_LABEL = /^Models within this group:\s*((?:(?:Gemini|Claude|GPT)[\w .,+()/-]{0,399})?)$/i;
  const MODEL_LIMIT_LABEL = /^(?:\d+[smhd]\s+limit|Gemini(?:\s+\d+(?:\.\d+)?)?(?:\s+[A-Za-z][\w-]{0,48}){1,3}\s+(?:Weekly|Daily|Five Hour)\s+Limit)$/i;
  const MODEL_PERCENT_LEFT = /^(?:\d+%\s+)?left$/i;
  const MODEL_RESET_LABEL = /^(?:(?:Weekly|Daily|\d+[smhd])\s+limit,\s*)?resets in (?:<1m|\d+[dhms](?:\s+\d+[dhms])*)$/i;
  function modelUiLabel(element) {
    if (!element || element.childElementCount || !element.closest('[role="menu"],[role="tooltip"],[data-testid="model-selector-panel"],[data-select-popup]')) return false;
    const original = nodeSlots.get(element.firstChild)?.get('')?.original ?? element.textContent ?? '';
    const value = normalize(original);
    if (!MODEL_LABELS.has(value) && !MODEL_LIMIT_LABEL.test(value) && !MODEL_PERCENT_LEFT.test(value) && !MODEL_GROUP_LABEL.test(value) && !MODEL_RESET_LABEL.test(value)) return false;
    // Only fixed interface labels may cross model containers. Content, names and editors stay protected.
    return ancestors(element).every(el => !matches(el, PROTECTED) || (el.hasAttribute('data-testid') && /model/.test(el.getAttribute('data-testid')) && !matches(el, '[data-gravitybox-protect],[contenteditable],.model-item')));
  }

  function isRelativeTimeBadge(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE || element.childElementCount) return false;
    // A time-shaped user title/body is still user content. Only a leaf badge inside a known row
    // can bypass the row's protection; use its saved original so Chinese does not change eligibility.
    const row = element.closest('[data-testid="conversation-row-sidebar"]');
    if (!row || element.matches('.truncate,[data-testid*="title"]') || element.closest('.truncate,[data-gravitybox-protect],.markdown,.prose,[data-message-author-role]')) return false;
    if (ancestors(element).some(el => el !== row && el.matches(PROTECTED))) return false;
    const text = element.firstChild;
    const original = nodeSlots.get(text)?.get('')?.original ?? element.textContent ?? '';
    return /^\d+(?:m|h|d|w|mo|y)$/.test(normalize(original));
  }
  function isElapsedDurationNode(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean(
      element.closest(
        '[data-testid="tool-group-elapsed"],[data-testid="tool-group-collapsible"],[data-testid="running-row"],[data-testid="ephemeral-tool-status"]'
      )
    );
  }
  function settingsProjectName(element,scan) {
    const button=element?.closest?.('button');
    if(!button||inSystemSettings(button,scan))return false;
    const pane=settingsScope;
    const root=pane?.closest('[role="dialog"],[data-testid="settings-root"],[data-testid="settings-dialog"]')||settingsDialogRoot(button);
    if(!root?.contains(button))return false;
    if(pane?pane.contains(button):Boolean(button.closest('main,[role="tabpanel"]')))return false;
    // The small standalone expansion control is built-in navigation, unlike project rows.
    const original=nodeSlots.get(button.firstChild)?.get('')?.original??button.textContent??'';
    if(button.matches('.mx-4.hover\\:underline:is(.text-xs,.text-sm)')&&['Show All','Show all','Show Less','Show less','显示全部','Collapse','收起'].includes(normalize(original)))return false;
    const headings=[...root.querySelectorAll('h2')].filter(e=>pane?!pane.contains(e):!e.closest('main,[role="tabpanel"]'));
    const label=e=>normalize(originalText(e))||(e.textContent||'').replace(/\s+/g,' ').trim();
    const start=headings.find(e=>['Projects','Project list','项目列表','项目'].includes(label(e)));
    if(!start||!(start.compareDocumentPosition(button)&Node.DOCUMENT_POSITION_FOLLOWING))return false;
    const next=headings.find(e=>e!==start&&(start.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING));
    return !next||!!(button.compareDocumentPosition(next)&Node.DOCUMENT_POSITION_FOLLOWING);
  }
  function isDialogProjectButton(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || !projectNames.size) return false;
    if (!matches(el, 'button,[role="button"]')) return false;
    if (!el.closest('[role="dialog"]')) return false;
    return projectNames.has(normalize(originalText(el)));
  }
  function isProtectedElement(el, scan = 0) {
    if (matches(el, PROTECTED_CORE)) return true;
    if (isDialogProjectButton(el)) return true;
    if (matches(el, '[data-testid*="model"]:not([data-testid^="shortcut-row-"])')) {
      return !inSystemSettings(el, scan) || matches(el, SETTINGS_MODEL_PROTECTED);
    }
    return inSystemSettings(el, scan) && matches(el, SETTINGS_MODEL_WIDGET) && Boolean(el.closest('[data-testid*="model"]'));
  }
  function blocked(element, scan = 0) {
    if(routeExcluded||restrictedAdaptiveRoute())return true;
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return true;
    // Appearance uses a styled DIV for its static code preview, without code/pre markup.
    if(inSystemSettings(element,scan)&&ancestors(element).some(el=>el.classList?.contains('font-mono')&&/^(pre|pre-wrap|break-spaces)$/.test(el.style.whiteSpace)))return true;
    if (isRelativeTimeBadge(element)) return false;
    if (modelUiLabel(element)) return false;
    if (userNamed(element) || settingsProjectName(element,scan)) return true;
    const cached = blockedCache.get(element);
    if (cached !== undefined && cached.scan === scan) return cached.val;
    const dialogProjectBtn = element.closest?.('[role="dialog"] button, [role="dialog"] [role="button"]');
    const isDialogProject = Boolean(dialogProjectBtn && projectNames.has(normalize(originalText(dialogProjectBtn))));
    const isProt = ancestors(element).some(el => isProtectedElement(el, scan)) || isDialogProject;
    blockedCache.set(element, { scan, val: isProt });
    return isProt;
  }
  let settingsScope=null,settingsScopeScan=-1;
  function inSystemSettings(element,scan) {
    if(scan!==settingsScopeScan||settingsScope&&!settingsScope.isConnected){settingsScopeScan=scan;settingsScope=systemSettingsPane();}
    return !!element&&!!settingsScope&&settingsScope.contains(element);
  }
  function isDialogPromptParagraph(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const p = element.closest('p');
    if (!p) return false;
    const dialog = p.closest('[role="dialog"],[role="alertdialog"]');
    if (!dialog) return false;
    const dialogLabel = dialog.getAttribute('aria-label');
    if (dialogLabel === 'Settings' || dialogLabel === '设置' || dialog.querySelector('aside,[data-testid*="settings"]')) return false;
    return Boolean(dialog.querySelector('[data-testid*="confirm"],button'));
  }
  function eligible(element, scan = 0) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (isRelativeTimeBadge(element)) return true;
    if (modelUiLabel(element)) return true;
    if (isDialogPromptParagraph(element)) return !blocked(element, scan);
    if(conservative&&(!element||!element.closest('button,[role="button"],[role="tab"],[role="menuitem"],[role="tooltip"],[role="alert"],[role="status"],label,h1,h2,h3,h4,a[href],[role="navigation"],[data-testid*="card"],[data-testid="cascade-system-message-toolbar"],[contenteditable="true"][role="combobox"]+p,[data-select-popup],[role="menu"],[role="listbox"],[role="option"],[data-testid*="empty"],[data-testid*="sidecar"],[data-testid*="trigger"],[data-testid*="modal"],[data-testid="toast-notification"],[data-testid="ssh-connect-progress"],[data-testid="ssh-connect-error"],[data-testid="ssh-config-file"],[data-testid="ssh-machine-switcher-status"]'))&&!pluginDescription(element)&&!inSystemSettings(element,scan))return false;
    const cached = eligibleCache.get(element);
    if (cached !== undefined && cached.scan === scan) return cached.val;
    const isElig = !blocked(element, scan) && (Boolean(element.closest(UI)) || pluginDescription(element) || inSystemSettings(element,scan));
    eligibleCache.set(element, { scan, val: isElig });
    return isElig;
  }
  /* Dictionary keys are matched case-insensitively via pre-compiled foldedMap in O(1) time. */
  function entryFor(key) {
    const entries = dictionary.entries;
    if (Object.hasOwn(entries, key)) return entries[key];
    return foldedMap.get(foldKey(key));
  }
  function nestedLabel(name) {
    return isBrandName(name) ? name : (entryFor(name) || name);
  }

  const RE_DUR_D = /(\d+)\s*d\b/gi;
  const RE_DUR_H = /(\d+)\s*h\b/gi;
  const RE_DUR_M = /(\d+)\s*m\b/gi;
  const RE_DUR_S = /(\d+)\s*s\b/gi;
  const RE_DUR_MS = /(\d+)\s*ms\b/gi;
  const RE_WHITESPACE = /\s+/g;
  function formatDuration(d) {
    return d
      .replace(RE_DUR_D, '$1天')
      .replace(RE_DUR_H, '$1小时')
      .replace(RE_DUR_M, '$1分')
      .replace(RE_DUR_S, '$1秒')
      .replace(RE_DUR_MS, '$1毫秒')
      .replace(RE_WHITESPACE, '');
  }

  const ENTITY_PROSE_STOP_WORDS = /^(?:a|an|the|your|our|my|this|that|these|those|what|when|where|how|why|which|who|all|any|some|each|every|more|most|allowed|denied|default|global|local|remote|external|workspace|editor|built-in|tab|link|hooks|new|other|in|on|at|to|for|from|with|by|of|as|if|or|and)\b/i;
  function isEntityNameSlot(value, maxWords = 4) {
    const v = String(value || '').trim();
    if (!v || v.length > 80) return false;
    if (/[.?!;:{}\n()]/.test(v)) return false;
    if (v.includes(', ')) return false;
    const words = v.split(/\s+/);
    if (words.length > maxWords) return false;
    if (words.length >= 2 && ENTITY_PROSE_STOP_WORDS.test(words[0])) return false;
    return true;
  }

  const TEMPLATE_RULES = [
    { key: "{model} Weekly Limit", pattern: /^(Gemini(?:\s+\d+(?:\.\d+)?)?(?:\s+[A-Za-z][\w-]{0,48}){1,3})\s+Weekly\s+Limit$/i, replace: (_, model) => `${model} 每周限额` },
    { key: "{model} Daily Limit", pattern: /^(Gemini(?:\s+\d+(?:\.\d+)?)?(?:\s+[A-Za-z][\w-]{0,48}){1,3})\s+Daily\s+Limit$/i, replace: (_, model) => `${model} 每日限额` },
    { key: "{model} Five Hour Limit", pattern: /^(Gemini(?:\s+\d+(?:\.\d+)?)?(?:\s+[A-Za-z][\w-]{0,48}){1,3})\s+Five\s+Hour\s+Limit$/i, replace: (_, model) => `${model} 5小时限额` },
    { key: "Models within this group: {models}", pattern: MODEL_GROUP_LABEL, replace: (_, models) => `此组包含的模型：${models}` },
    { key: "Load older messages, showing {shown} of {total}", pattern: /^Load older messages, showing (\d+) of (\d+)$/i, replace: (_,shown,total) => `加载更早消息（已显示 ${shown} / ${total} 条）` },
    {
      key: "Resets in {duration}", pattern: /^Resets in (<1m|\d+[dhms](?:\s+\d+[dhms])*)$/i,
      replace: (_, time) => time === '<1m' ? '将在 1 分钟内重置' : `${time.replace(/(\d+)d/g, '$1天').replace(/(\d+)h/g, '$1小时').replace(/(\d+)m/g, '$1分钟').replace(/(\d+)s/g, '$1秒')}后重置`
    },
    {
      key: "{window} limit, resets in {duration}",
      pattern: /^((?:\d+[smhd]|Weekly|Daily))\s+limit,\s*resets\s+in\s+(<1m|\d+[dhms](?:\s+\d+[dhms])*)$/i,
      replace: (_, window, time) => {
        let winText = window;
        const wLower = window.toLowerCase();
        if (wLower === 'weekly') winText = '每周';
        else if (wLower === 'daily') winText = '每日';
        else {
          const m = window.match(/^(\d+)([smhd])$/i);
          if (m) winText = `${m[1]}${{ s: '秒', m: '分钟', h: '小时', d: '天' }[m[2].toLowerCase()] || m[2]}`;
        }
        const timeText = time === '<1m' ? '将在 1 分钟内重置' : `${time.replace(/(\d+)d/g, '$1天').replace(/(\d+)h/g, '$1小时').replace(/(\d+)m/g, '$1分钟').replace(/(\d+)s/g, '$1秒')}后重置`;
        return `${winText}限额，${timeText}`;
      }
    },
    {
      key: "{window} limit",
      pattern: /^(\d+)([smhd])\s+limit$/i,
      replace: (_, count, unit) => `${count}${{ s: '秒', m: '分钟', h: '小时', d: '天' }[unit.toLowerCase()] || unit}限额`
    },
    {
      key: "{percent}% left",
      pattern: /^(\d+)%\s+left$/i,
      replace: (_, p) => `${p}% 剩余`
    },
    {
      key: "Send feedback as {email}",
      pattern: /^Send feedback as\s+(.+)$/i,
      replace: (_, email) => `以 ${email} 身份发送反馈`
    },
    // 1. Agent 执行时长与阶段状态 (如 Worked for 49s / Stopped after 12s / 42s / 1m 12s)
    {
      key: "Worked for {duration}", pattern: /^Worked for\s+(\d+.*)$/i,
      replace: (_, d) => `已用时 ${formatDuration(d)}`
    },
    {
      key: "Stopped after {duration}", pattern: /^Stopped after\s+(\d+.*)$/i,
      replace: (_, d) => `在 ${formatDuration(d)} 后停止`
    },
    {
      key: "Thinking duration: {duration}", pattern: /^Thinking duration:\s*(\d+.*)$/i,
      replace: (_, d) => `思考时长：${formatDuration(d)}`
    },
    {
      key: "Thinking for {duration}", pattern: /^(?:Thought|Thinking)\s+for\s+(\d+.*)$/i,
      replace: (_, d) => `已思考 ${formatDuration(d)}`
    },
    {
      key: "{duration}",
      pattern: /^(?:\d+\s*d\s+)?(?:\d+\s*h\s+)?\d+\s*m\s+\d+\s*s$|^(?:\d+\s*d\s+)?\d+\s*h\s+\d+\s*m$|^\d+\s*(?:ms|s)$/i,
      replace: (d) => formatDuration(d)
    },

    // 2. 列表折叠展开与分页 (如 See 6 more / See 5 more plugins)
    {
      key: "See {count} more {category}", pattern: /^See\s+(\d+)\s+more\s+(.+)$/i,
      replace: (_, n, type) => {
        const typeMap = {
          plugins: '个插件',
          skills: '个技能',
          bundles: '个扩展包',
          items: '项',
          widgets: '个小部件',
          tools: '个工具',
          models: '个模型',
          options: '个选项'
        };
        const mapped = typeMap[type.toLowerCase().trim()];
        return mapped ? `查看另外 ${n} ${mapped}` : `查看另外 ${n} 个${type}`;
      }
    },
    {
      key: "See {count} more", pattern: /^See\s+(\d+)\s+more$/i,
      replace: (_, n) => `查看另外 ${n} 项`
    },
    {
      key: "Show {count} more", pattern: /^Show\s+(\d+)\s+more$/i,
      replace: (_, n) => `显示另外 ${n} 项`
    },
    {
      key: "Page {page} of {total}", pattern: /^Page\s+(\d+)\s+of\s+(\d+)$/i,
      replace: (_, p, total) => `第 ${p} 页，共 ${total} 页`
    },
    {
      key: "Showing {count} of {total}", pattern: /^Showing\s+(\d+)\s+of\s+(\d+)(?:\s+(.+))?$/i,
      replace: (_, a, b, rest) => {
        if (!rest) return `显示第 ${a} / ${b} 项`;
        const restLower = rest.toLowerCase().trim();
        if (restLower === 'results') return `显示第 ${a} / ${b} 个结果`;
        if (restLower === 'messages') return `显示第 ${a} / ${b} 条消息`;
        if (restLower === 'items') return `显示第 ${a} / ${b} 项`;
        return `显示第 ${a} / ${b} 项（${rest}）`;
      }
    },
    {
      key: "No more older messages, showing {count} of {total}", pattern: /^No more older messages,\s*showing\s+(\d+)\s+of\s+(\d+)$/i,
      replace: (_, a, b) => `没有更早的消息了，当前显示第 ${a} / ${b} 条`
    },

    // 3. 针对特定目标的动态操作 (如 More actions for Google Drive)
    {
      key: "More actions for {name}", pattern: /^More actions for\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, name) => `${name} 的更多操作`
    },

    // 4. 计数类动态标签 (tools / plugins / steps / comments / results)
    {
      key: "{count} tools enabled", pattern: /^(\d+)\s+tools?\s+enabled$/i,
      replace: (_, n) => `已启用 ${n} 个工具`
    },
    {
      key: "{count} plugins enabled", pattern: /^(\d+)\s+plugins?\s+enabled$/i,
      replace: (_, n) => `已启用 ${n} 个插件`
    },
    {
      key: "{count} skills enabled", pattern: /^(\d+)\s+skills?\s+enabled$/i,
      replace: (_, n) => `已启用 ${n} 个技能`
    },
    {
      key: "{count} rules enabled", pattern: /^(\d+)\s+rules?\s+enabled$/i,
      replace: (_, n) => `已启用 ${n} 条规则`
    },
    {
      key: "{count} hooks enabled", pattern: /^(\d+)\s+hooks?\s+enabled$/i,
      replace: (_, n) => `已启用 ${n} 个钩子`
    },
    {
      key: "({count} steps)", pattern: /^\((\d+)\s+steps?\)$/i,
      replace: (_, n) => `(${n} 步)`
    },
    {
      key: "({count} comments)", pattern: /^\((\d+)\s+comments?\)$/i,
      replace: (_, n) => `(${n} 条评论)`
    },
    {
      key: "{count} results", pattern: /^(\d+)\s+results?$/i,
      replace: (_, n) => `${n} 个结果`
    },
    {
      key: "{count} files", pattern: /^(\d+)\s+files?$/i,
      replace: (_, n) => `${n} 个文件`
    },
    {
      key: "{count} conversations", pattern: /^(\d+)\s+conversations?$/i,
      replace: (_, n) => `${n} 个对话`
    },
    {
      key: "{count} changes", pattern: /^(\d+)\s+changes?$/i,
      replace: (_, n) => `${n} 处更改`
    },
    {
      key: "{count} errors", pattern: /^(\d+)\s+errors?$/i,
      replace: (_, n) => `${n} 个错误`
    },
    {
      key: "{count} warnings", pattern: /^(\d+)\s+warnings?$/i,
      replace: (_, n) => `${n} 个警告`
    },
    {
      key: "{count} items", pattern: /^(\d+)\s+items?$/i,
      replace: (_, n) => `${n} 项`
    },
    {
      key: "{count} selected", pattern: /^(\d+)\s+selected$/i,
      replace: (_, n) => `已选择 ${n} 项`
    },
    {
      key: "Retry ({count})", pattern: /^Retry\s+\((\d+)\)$/i,
      replace: (_, n) => `重试 (${n})`
    },
    {
      key: "{count} files changed", pattern: /^(\d+)\s+files?\s+changed$/i,
      replace: (_, n) => `已更改 ${n} 个文件`
    },
    {
      key: "Select model, current: {model}", pattern: /^Select model,\s*current:\s*(.+)$/i,
      replace: (_, m) => `选择模型，当前：${m}`
    },

    // 5. 权限预设动态选择器 (如 Agent permissions preset selector, current: Turbo)
    {
      key: "Agent permissions preset selector, current: {preset}", pattern: /^Agent permissions preset selector,\s*current:\s*(.+)$/i,
      replace: (_, preset) => {
        const pMap = { Turbo: '极速模式 (Turbo)', Autonomous: '自主模式', Default: '默认模式' };
        return `智能体权限预设选择器，当前：${pMap[preset.trim()] || preset}`;
      }
    },

    // 6. 侧边栏相对时间徽章 (如 13m、5d、1mo、13m ago)
    {
      key: "{count}{timeUnit} ago", pattern: /^(\d+)\s*(s|m|h|d|w|mo|y)\s+ago$/i,
      replace: (_, n, u) => {
        const uMap = { s: '秒前', m: '分钟前', h: '小时前', d: '天前', w: '周前', mo: '个月前', y: '年前' };
        return `${n}${uMap[u.toLowerCase()] || u}`;
      }
    },
    {
      key: "Running {count} tasks", pattern: /^Running\s+(\d+)\s+tasks?$/i,
      replace: (_, n) => `正在运行 ${n} 个任务`
    },
    {
      key: "Completed {count} tasks", pattern: /^Completed\s+(\d+)\s+tasks?$/i,
      replace: (_, n) => `已完成 ${n} 个任务`
    },
    {
      key: "{count}{timeUnit}", pattern: /^(\d+)(m|h|d|w|mo|y)$/,
      guard: (el) =>
        (isRelativeTimeBadge(el) || Boolean(el?.closest?.('[data-gravitybox-ui]'))) &&
        !isElapsedDurationNode(el) &&
        !el?.closest?.('[data-testid*="model"],[data-testid*="quota"],[role="menu"]'),
      replace: (_, n, u) => {
        const uMap = { m: '分钟前', h: '小时前', d: '天前', w: '周前', mo: '个月前', y: '年前' };
        return `${n}${uMap[u] || u}`;
      }
    },

    // 7. 过滤项与全局安装路径
    {
      key: "Filter skills and rules: {filter}",
      pattern: /^Filter\s+skills\s+and\s+rules:\s*(.+)$/i,
      replace: (_, filter) => `筛选技能与规则：${nestedLabel(filter)}`
    },
    {
      key: "Filter {category}: All", pattern: /^Filter\s+(.+):\s+All$/i,
      replace: (_, cat) => `筛选 ${entryFor(cat) || cat}：全部`
    },
    {
      key: "Global: Installed in {path}", pattern: /^Global:\s+Installed in\s+(.+)$/i,
      replace: (_, p) => `全局：已安装于 ${p}`
    },

    // 8. 模型配额与刷新限额动态提示 (如 You have used some of your weekly limit, it will fully refresh in 20 hours, 52 minutes.)
    {
      key: "You have used some of your {period} limit, it will fully refresh in {duration}.", pattern: /^You have (used some of|hit) your (weekly|daily|5-hour|five[- ]hour|\d+[- ]?(?:hour|day|minute)|\w+) limit, it will fully refresh in (.+?)\.?$/i,
      replace: (_, action, period, time) => {
        const actZh = /hit/i.test(action) ? '已达到' : '已使用了部分';
        const normP = period.toLowerCase().replace(/\s+/g, ' ');
        const pMap = { weekly: '每周', daily: '每日', '5-hour': '5小时', 'five-hour': '5小时', 'five hour': '5小时' };
        const pZh = pMap[normP] || period;
        const timeZh = time
          .replace(/(\d+)\s*days?/gi, '$1天')
          .replace(/(\d+)\s*hours?/gi, '$1小时')
          .replace(/(\d+)\s*minutes?/gi, '$1分钟')
          .replace(/(\d+)\s*seconds?/gi, '$1秒')
          .replace(/,\s*/g, ' ')
          .trim();
        return `您${actZh}${pZh}限额，将在 ${timeZh} 后完全刷新。`;
      }
    },
    {
      key: "It will fully refresh in {duration}.", pattern: /^It will fully refresh in (.+?)\.?$/i,
      replace: (_, time) => {
        const timeZh = time
          .replace(/(\d+)\s*days?/gi, '$1天')
          .replace(/(\d+)\s*hours?/gi, '$1小时')
          .replace(/(\d+)\s*minutes?/gi, '$1分钟')
          .replace(/(\d+)\s*seconds?/gi, '$1秒')
          .replace(/,\s*/g, ' ')
          .trim();
        return `将在 ${timeZh} 后完全刷新。`;
      }
    },
    {
      key: "{provider} models", pattern: /^(Gemini|Claude and GPT)\s+models$/i,
      replace: (_, brand) => `${brand.toLowerCase() === 'claude and gpt' ? 'Claude 与 GPT' : brand} 系列模型`
    },

    // 9. 界面复合前缀与截断片段 (消除拼接断裂感)
    {
      key: "{category} (", pattern: /^(Child Subagents|Generation Steps|Tools|Subagents|Workspaces|Plugins|Skills|Rules|Hooks|Mcp|Sessions)\s*\($/i,
      replace: (_, name) => {
        const nMap = {
          'child subagents': '子智能体',
          'generation steps': '生成步骤',
          'tools': '工具',
          'subagents': '子智能体',
          'workspaces': '工作区',
          'plugins': '插件',
          'skills': '技能',
          'rules': '规则',
          'hooks': '钩子',
          'mcp': 'MCP',
          'sessions': '会话'
        };
        const zh = nMap[name.toLowerCase().trim()] || name;
        return `${zh} (`;
      }
    },
    // 10. 复合内联容器整句模板 (Inline-Group Contextual Translation)
    {
      key: "Are you sure you want to delete {0}?", pattern: /^Are you sure you want to delete\s+(?:the\s+)?\{(\d+)\}\??$/i,
      replace: (_, idx) => `您确定要删除 {${idx}} 吗？`
    },
    {
      key: "AI Credits are used when you've exceeded your model quota. Keep track of your current AI Credits in the {0}.", pattern: /^AI Credits are used when you've exceeded your model quota\. Keep track of your current AI Credits in the \{(\d+)\}\.?$/i,
      replace: (_, idx) => `AI 额度会在超出模型配额时使用。请在 {${idx}} 中查看您当前的 AI 额度。`
    },
    {
      key: "ABFS is required to create ABFS workspaces. Please visit {0}.", pattern: /^ABFS is required to create ABFS workspaces\.\s*Please visit \{(\d+)\}\.?$/i,
      replace: (_, idx) => `创建 ABFS 工作区需要 ABFS。请访问 {${idx}}。`
    },
    {
      key: "Please verify your account, then sign in again to continue. Learn more by visiting our {0}.", pattern: /^Please verify your account,\s*then sign in again to continue\.\s*Learn more by visiting our \{(\d+)\}\.?$/i,
      replace: (_, idx) => `请验证您的账号后重新登录以继续。访问我们的 {${idx}} 了解更多信息。`
    },
    {
      key: "For a full list of available locations and deployment endpoints, please refer to the {0}.", pattern: /^For a full list of available locations and deployment endpoints,\s*please refer to the \{(\d+)\}\.?$/i,
      replace: (_, idx) => `如需查看可用区域与部署端点的完整列表，请参阅{${idx}}。`
    },
    {
      key: "Remote Control isn't active on this instance. Enable it in {0}.", pattern: /^Remote Control isn't active on this instance\.\s*Enable it in \{(\d+)\}\.?$/i,
      replace: (_, idx) => `当前实例未启用远程控制，请在{${idx}}中开启。`
    },
    {
      key: "Need help? Reach out in the {0}.", pattern: /^Need help\?\s*Reach out in the \{(\d+)\}\.?$/i,
      replace: (_, idx) => `需要帮助？前往 {${idx}} 联系我们。`
    },
    {
      key: "Sharing is a preview feature. It exports this conversation's history to your {0}.", pattern: /^Sharing is a preview feature\.\s*It exports this conversation's history to your \{(\d+)\}\.?$/i,
      replace: (_, idx) => `共享为预览功能，会将当前对话历史导出至您的 {${idx}}。`
    },
    {
      key: "This will permanently delete {0}.", pattern: /^This will permanently delete \{(\d+)\}\.?$/i,
      replace: (_, idx) => `这将永久删除 {${idx}}。`
    },
    {
      key: "Your existing conversations in CitC are grouped under a {0}.", pattern: /^Your existing conversations in CitC are grouped under a \{(\d+)\}\.?$/i,
      replace: (_, idx) => `您在 CitC 中的现有对话已归组至 {${idx}} 下。`
    },
    {
      key: "This project was created for {0}.", pattern: /^This project was created for \{(\d+)\}\.?$/i,
      replace: (_, idx) => `此项目专为 {${idx}} 创建。`
    },
    {
      key: "You can opt-out temporarily using {0}.", pattern: /^You can opt-out temporarily using \{(\d+)\}\.?$/i,
      replace: (_, idx) => `您可以使用 {${idx}} 暂时停用此功能。`
    },
    {
      key: "cogfsd and cidermux are required to create Cog workspaces. Please visit {0}.", pattern: /^cogfsd and cidermux are required to create Cog workspaces\.\s*Please visit \{(\d+)\}\.?$/i,
      replace: (_, idx) => `创建 Cog 工作区需要 cogfsd 和 cidermux。请访问 {${idx}}。`
    },
    {
      key: "Validated with GitHub and stored in {0}.", pattern: /^Validated with GitHub and stored in \{(\d+)\}\.?$/i,
      replace: (_, idx) => `已通过 GitHub 验证并存储于 {${idx}}。`
    },
    {
      key: "View archived conversations in {0}.", pattern: /^View archived conversations in \{(\d+)\}\.?$/i,
      replace: (_, idx) => `请在 {${idx}} 中查看已归档对话。`
    },
    {
      key: "Please verify your account to continue using {0}.", pattern: /^Please verify your account to continue using \{(\d+)\}\.?$/i,
      replace: (_, idx) => `请验证您的账号以继续使用 {${idx}}。`
    },
    {
      key: "Are you sure you want to delete the", pattern: /^Are you sure you want to delete the\s*$/i,
      replace: () => '您确定要删除该'
    },
    {
      key: "Are you sure you want to delete {name}?", pattern: /^Are you sure you want to delete\s+(?:the\s+)?(.+?)\?$/i,
      replace: (_, target) => `您确定要删除 ${target} 吗？`
    },
    {
      key: "ABFS is required to create ABFS workspaces. Please visit", pattern: /^ABFS is required to create ABFS workspaces\.\s*Please visit\s*$/i,
      replace: () => '创建 ABFS 工作区需要 ABFS，请访问'
    },
    // 11. 补充复合内联容器整句模板 (Inline-Group {0}/{1})
    {
      key: "Avoid uploading highly sensitive data and verify actions taken by your agent. Make sure you have the {0} to share data.",
      pattern: /^Avoid uploading highly sensitive data and verify actions taken by your agent\.\s*Make sure you have the \{(\d+)\} to share data\.?$/i,
      replace: (_, idx) => `请避免上传高度敏感数据，并核实智能体执行的操作。请确保您拥有 {${idx}} 以共享数据。`
    },
    {
      key: "Avoid uploading highly sensitive data and verify actions taken by your agent. Make sure you have the {0}.",
      pattern: /^Avoid uploading highly sensitive data and verify actions taken by your agent\.\s*Make sure you have the \{(\d+)\}\.?$/i,
      replace: (_, idx) => `请避免上传高度敏感数据，并核实智能体执行的操作。请确保您拥有 {${idx}}。`
    },
    {
      key: "By using this app, you agree to its {0} and {1}.",
      pattern: /^By using this app,\s*you agree to its \{(\d+)\} and \{(\d+)\}\.?$/i,
      replace: (_, a, b) => `使用此应用即表示您同意其 {${a}} 和 {${b}}。`
    },
    {
      key: "By using this app, you agree to its {0}.",
      pattern: /^By using this app,\s*you agree to its \{(\d+)\}\.?$/i,
      replace: (_, a) => `使用此应用即表示您同意其 {${a}}。`
    },
    {
      key: "Long pages like this one will be broken down into outlines and read as needed. Read more at our {0}.",
      pattern: /^Long pages like this one will be broken down into outlines and read as needed\.\s*Read more at our \{(\d+)\}\.?$/i,
      replace: (_, idx) => `像这样的长页面会被拆分为大纲并按需读取。详情请参阅我们的 {${idx}}。`
    },
    {
      key: "Many external websites (such as Google Search, GitHub, or Wikipedia) restrict iframe embedding via {0} or {1}.",
      pattern: /^Many external websites \(such as Google Search, GitHub, or Wikipedia\) restrict iframe embedding via \{(\d+)\} or \{(\d+)\}\.?$/i,
      replace: (_, a, b) => `许多外部网站（例如 Google 搜索、GitHub 或 Wikipedia）会通过 {${a}} 或 {${b}} 限制 iframe 嵌入。`
    },
    {
      key: "Many external websites (such as Google Search, GitHub, or Wikipedia) restrict iframe embedding via {0}.",
      pattern: /^Many external websites \(such as Google Search, GitHub, or Wikipedia\) restrict iframe embedding via \{(\d+)\}\.?$/i,
      replace: (_, a) => `许多外部网站（例如 Google 搜索、GitHub 或 Wikipedia）会通过 {${a}} 限制 iframe 嵌入。`
    },
    {
      key: "Your feedback directly improves Gemini. See {0}.",
      pattern: /^Your feedback directly improves Gemini\.\s*See \{(\d+)\}\.?$/i,
      replace: (_, idx) => `您的反馈将直接帮助改进 Gemini。请参阅 {${idx}}。`
    },
    {
      key: "For Antigravity Business consumption options, see {0}.",
      pattern: /^For Antigravity Business consumption options,\s*see \{(\d+)\}\.?$/i,
      replace: (_, idx) => `有关 Antigravity 商业版消费选项，请参阅 {${idx}}。`
    },
    {
      key: "To switch accounts, sign out in the {0}.",
      pattern: /^To switch accounts,\s*sign out in the \{(\d+)\}\.?$/i,
      replace: (_, idx) => `若要切换账号，请在 {${idx}} 中退出登录。`
    },
    {
      key: "Shared conversations live in your x20 user directory, so readers need {0} to view them.",
      pattern: /^Shared conversations live in your x20 user directory,\s*so readers need \{(\d+)\} to view them\.?$/i,
      replace: (_, idx) => `共享对话保存在您的 x20 用户目录中，因此读者需要 {${idx}} 权限才能查看。`
    },
    {
      key: "Scan the code to open this device in Remote Control, or {0}.",
      pattern: /^Scan the code to open this device in Remote Control,\s*or \{(\d+)\}\.?$/i,
      replace: (_, idx) => `扫描二维码以在远程控制中打开此设备，或 {${idx}}。`
    },
    {
      key: "Project {0} already exists for this folder. Would you like to continue using it or make a new one?",
      pattern: /^Project\s+\{(\d+)\}\s+already\s+exists\s+for\s+this\s+folder\.\s*Would\s+you\s+like\s+to\s+continue\s+using\s+it\s+or\s+make\s+a\s+new\s+one\??$/i,
      replace: (_, idx) => `此文件夹已存在项目 {${idx}}。您想继续使用它，还是新建一个？`
    },
    {
      key: "Project {0} already exists for this combination of folders. Would you like to continue using it or make a new one?",
      pattern: /^Project\s+\{(\d+)\}\s+already\s+exists\s+for\s+this\s+combination\s+of\s+folders\.\s*Would\s+you\s+like\s+to\s+continue\s+using\s+it\s+or\s+make\s+a\s+new\s+one\??$/i,
      replace: (_, idx) => `此文件夹组合已存在项目 {${idx}}。您想继续使用它，还是新建一个？`
    },
    {
      key: "A {0} with the same folder exists",
      pattern: /^A\s+\{(\d+)\}\s+with\s+the\s+same\s+folders?\s+exists\.?$/i,
      replace: (_, idx) => `已存在使用相同文件夹的{${idx}}`
    },
    {
      key: "A similar {0} exists",
      pattern: /^A\s+similar\s+\{(\d+)\}\s+exists\.?$/i,
      replace: (_, idx) => `已存在类似的{${idx}}`
    },
    {
      key: "View archived in the sidebar ({0} menu).",
      pattern: /^View\s+archived\s+in\s+the\s+sidebar\s+\(\{(\d+)\}\s+menu\)\.?$/i,
      replace: (_, idx) => `可在侧边栏（{${idx}}菜单）中查看已归档项。`
    },
    {
      key: "({0} menu)",
      pattern: /^\(\{(\d+)\}\s+menu\)$/i,
      replace: (_, idx) => `（{${idx}}菜单）`
    },
    {
      key: "View archived in the sidebar {0}.",
      pattern: /^View\s+archived\s+in\s+the\s+sidebar\s+\{(\d+)\}\.?$/i,
      replace: (_, idx) => `可在侧边栏{${idx}}中查看已归档项。`
    },
    {
      key: "Search conversations with {0} in the top left.",
      pattern: /^Search\s+conversations\s+with\s+\{(\d+)\}\s+in\s+the\s+top\s+left\.?$/i,
      replace: (_, idx) => `使用左上角的{${idx}}搜索对话。`
    },
    // 12. 补充多版本 UI 动态计数、状态后缀、工具调用、Git 与配额模板 (2.23.0 - 2.28.0)
    {
      key: "{count} accounts", pattern: /^(\d+)\s+accounts?$/i,
      replace: (_, n) => `${n} 个账号`
    },
    {
      key: "{count} attachments", pattern: /^(\d+)\s+attachments?$/i,
      replace: (_, n) => `${n} 个附件`
    },
    {
      key: "{count} blocked", pattern: /^(\d+)\s+blocked$/i,
      replace: (_, n) => `已阻止 ${n} 项`
    },
    {
      key: "{count} bytes", pattern: /^(\d+)\s+bytes?$/i,
      replace: (_, n) => `${n} 字节`
    },
    {
      key: "{count} chunks", pattern: /^(\d+)\s+chunks?$/i,
      replace: (_, n) => `${n} 个分块`
    },
    {
      key: "{count} comments", pattern: /^(\d+)\s+comments?$/i,
      replace: (_, n) => `${n} 条评论`
    },
    {
      key: "{count} demoted", pattern: /^(\d+)\s+demoted$/i,
      replace: (_, n) => `已降级 ${n} 项`
    },
    {
      key: "{count} excluded", pattern: /^(\d+)\s+excluded$/i,
      replace: (_, n) => `已排除 ${n} 项`
    },
    {
      key: "{count} fields", pattern: /^(\d+)\s+fields?$/i,
      replace: (_, n) => `${n} 个字段`
    },
    {
      key: "{count} Files With Changes", pattern: /^(\d+)\s+Files?\s+With\s+Changes$/i,
      replace: (_, n) => `${n} 个文件有更改`
    },
    {
      key: "{count} questions", pattern: /^(\d+)\s+questions?$/i,
      replace: (_, n) => `${n} 个问题`
    },
    {
      key: "{count} Side Questions", pattern: /^(\d+)\s+Side\s+Questions?$/i,
      replace: (_, n) => `${n} 个侧边提问`
    },
    {
      key: "{count} seconds", pattern: /^(\d+)\s+seconds?$/i,
      replace: (_, n) => `${n} 秒`
    },
    {
      key: "{count} tools", pattern: /^(\d+)\s+tools?$/i,
      replace: (_, n) => `${n} 个工具`
    },
    {
      key: "{count} turns", pattern: /^(\d+)\s+turns?$/i,
      replace: (_, n) => `${n} 轮对话`
    },
    {
      key: "{count} unresolved", pattern: /^(\d+)\s+unresolved$/i,
      replace: (_, n) => `${n} 项未解决`
    },
    {
      key: "{count} Background Processes Running", pattern: /^(\d+)\s+Background\s+Process(?:es)?\s+Running$/i,
      replace: (_, n) => `${n} 个后台进程正在运行`
    },
    {
      key: "(Steps {start}–{end})", pattern: /^\(Steps?\s+(\d+)[–-](\d+)\)$/i,
      replace: (_, a, b) => `(第 ${a}–${b} 步)`
    },
    {
      key: "Turns {start}–{end}", pattern: /^Turns?\s+(\d+)[–-](\d+)$/i,
      replace: (_, a, b) => `第 ${a}–${b} 轮`
    },
    {
      key: "Turn {current} of {total}", pattern: /^Turn\s+(\d+)\s+of\s+(\d+)$/i,
      replace: (_, a, b) => `第 ${a} / ${b} 轮`
    },
    {
      key: "Turn {index}", pattern: /^Turn\s+(\d+)$/i,
      replace: (_, a) => `第 ${a} 轮`
    },
    {
      key: "Question {current} of {total}", pattern: /^Question\s+(\d+)\s+of\s+(\d+)$/i,
      replace: (_, a, b) => `第 ${a} / ${b} 个问题`
    },
    {
      key: "Line {line}", pattern: /^Line\s+(\d+)$/i,
      replace: (_, a) => `第 ${a} 行`
    },
    {
      key: "Chunk {index}", pattern: /^Chunk\s+(\d+)$/i,
      replace: (_, a) => `分块 ${a}`
    },
    {
      key: "Page {page} failed to load", pattern: /^Page\s+(\d+)\s+failed\s+to\s+load$/i,
      replace: (_, a) => `第 ${a} 页加载失败`
    },
    {
      key: "Go to page {page}", pattern: /^Go\s+to\s+page\s+(\d+)$/i,
      replace: (_, a) => `前往第 ${a} 页`
    },
    {
      key: "Go to slide {slide}", pattern: /^Go\s+to\s+slide\s+(\d+)$/i,
      replace: (_, a) => `前往第 ${a} 张幻灯片`
    },
    {
      key: "Go to turn {current} of {total}", pattern: /^Go\s+to\s+turn\s+(\d+)\s+of\s+(\d+)$/i,
      replace: (_, a, b) => `前往第 ${a} / ${b} 轮`
    },
    {
      key: "Playback speed {rate}x", pattern: /^Playback\s+speed\s+([\d.]+)x$/i,
      replace: (_, r) => `播放速度 ${r}x`
    },
    {
      key: "Zoom {percent}%, reset to fit", pattern: /^Zoom\s+(\d+)%,\s*reset\s+to\s+fit$/i,
      replace: (_, p) => `缩放 ${p}%，点击重置为适合窗口`
    },
    {
      key: "Still thinking, {seconds} seconds", pattern: /^Still\s+thinking,\s*(\d+)\s+seconds?$/i,
      replace: (_, s) => `仍在思考，已用时 ${s} 秒`
    },
    {
      key: "Waiting for command completion (up to {seconds} seconds)", pattern: /^Waiting\s+for\s+command\s+completion\s*\(up\s+to\s+(\d+)\s+seconds?\)$/i,
      replace: (_, s) => `正在等待命令完成（最多 ${s} 秒）`
    },
    {
      key: "{name} (Default)", pattern: /^(.+?)\s+\(Default\)$/i,
      replace: (_, name) => `${nestedLabel(name)}（默认）`
    },
    {
      key: "{name} (Archived)", pattern: /^(.+?)\s+\(Archived\)$/i,
      replace: (_, name) => `${nestedLabel(name)}（已归档）`
    },
    {
      key: "{name} (Experimental)", pattern: /^(.+?)\s+\(Experimental\)$/i,
      replace: (_, name) => `${nestedLabel(name)}（实验性）`
    },
    {
      key: "{name} (disabled by admin)", pattern: /^(.+?)\s+\(disabled\s+by\s+admin\)$/i,
      replace: (_, name) => `${nestedLabel(name)}（已被管理员禁用）`
    },
    {
      key: "{name} [Remote]", pattern: /^(.+?)\s+\[Remote\]$/i,
      replace: (_, name) => `${nestedLabel(name)} [远程]`
    },
    {
      key: "{name}, setup required", pattern: /^(.+?),\s*setup\s+required$/i,
      replace: (_, name) => `${nestedLabel(name)}（需要配置）`
    },
    {
      key: "{name} · Context window", pattern: /^(.+?)\s*·\s*Context\s+window$/i,
      replace: (_, name) => `${nestedLabel(name)} · 上下文窗口`
    },
    {
      key: "{name}: Expired", pattern: /^(.+?):\s+Expired$/i,
      replace: (_, name) => `${nestedLabel(name)}：已过期`
    },
    {
      key: "{name}: Invalid", pattern: /^(.+?):\s+Invalid$/i,
      replace: (_, name) => `${nestedLabel(name)}：无效`
    },
    {
      key: "{name}: Unknown", pattern: /^(.+?):\s+Unknown$/i,
      replace: (_, name) => `${nestedLabel(name)}：未知`
    },
    {
      key: "Viewed {file}:{start}-{end}", pattern: /^Viewed\s+(.+?):(\d+)-(\d+)$/i,
      replace: (_, f, a, b) => `已查看 ${f}:${a}-${b}`
    },
    {
      key: "Listed directory {path}", pattern: /^Listed\s+directory\s+(.+)$/i,
      replace: (_, p) => `已列出目录 ${p}`
    },
    {
      key: "Searched for files: {query}", pattern: /^Searched\s+for\s+files:\s*(.+)$/i,
      replace: (_, q) => `已搜索文件：${q}`
    },
    {
      key: "Opened browser: {url}", pattern: /^Opened\s+browser:\s*(.+)$/i,
      replace: (_, u) => `已打开浏览器：${u}`
    },
    {
      key: "Read URL: {url}", pattern: /^Read\s+URL:\s*(.+)$/i,
      replace: (_, u) => `已读取 URL：${u}`
    },
    {
      key: "Typed '{text}' in Browser", pattern: /^Typed\s+'(.+)'\s+in\s+Browser$/i,
      replace: (_, t) => `已在浏览器中输入 '${t}'`
    },
    {
      key: "Typing '{text}' in Browser", pattern: /^Typing\s+'(.+)'\s+in\s+Browser$/i,
      replace: (_, t) => `正在浏览器中输入 '${t}'`
    },
    {
      key: "Ran command: {summary} (`{command}`)", pattern: /^Ran\s+command:\s*(.+?)\s+\(`(.+)`\)$/i,
      replace: (_, s, c) => `已运行命令：${s} (\`${c}\`)`
    },
    {
      key: "Ran command: `{command}`", pattern: /^Ran\s+command:\s*`(.+)`$/i,
      replace: (_, c) => `已运行命令：\`${c}\``
    },
    {
      key: "Used MCP tool: {tool}", pattern: /^Used\s+MCP\s+tool:\s*(.+)$/i,
      replace: (_, t) => `已使用 MCP 工具：${t}`
    },
    {
      key: "Used tool: {tool}", pattern: /^Used\s+tool:\s*(.+)$/i,
      replace: (_, t) => `已使用工具：${t}`
    },
    {
      key: "Invoked subagent: {name}", pattern: /^Invoked\s+subagent:\s*(.+)$/i,
      replace: (_, n) => `已调用子智能体：${n}`
    },
    {
      key: "Open Subagent: {name}", pattern: /^Open\s+Subagent:\s*(.+)$/i,
      replace: (_, n) => `打开子智能体：${n}`
    },
    {
      key: "Sending {input} to command", pattern: /^Sending\s+(.+?)\s+to\s+command$/i,
      replace: (_, x) => `正在向命令发送 ${x}`
    },
    {
      key: "Sent {input} to command", pattern: /^Sent\s+(.+?)\s+to\s+command$/i,
      replace: (_, x) => `已向命令发送 ${x}`
    },
    {
      key: "Suggested sending {input} to command", pattern: /^Suggested\s+sending\s+(.+?)\s+to\s+command$/i,
      replace: (_, x) => `建议向命令发送 ${x}`
    },
    {
      key: "Rejected sending {input} to command", pattern: /^Rejected\s+sending\s+(.+?)\s+to\s+command$/i,
      replace: (_, x) => `已拒绝向命令发送 ${x}`
    },
    {
      key: "Error sending {input} to command", pattern: /^Error\s+sending\s+(.+?)\s+to\s+command$/i,
      replace: (_, x) => `向命令发送 ${x} 时出错`
    },
    {
      key: "Exited with code {code}.", pattern: /^Exited\s+with\s+code\s+(\d+)\.?$/i,
      replace: (_, c) => `已退出，退出码：${c}。`
    },
    {
      key: "Committed to {branch}.", pattern: /^Committed\s+to\s+(.+?)\.?$/i,
      replace: (_, b) => `已提交至 ${b}。`
    },
    {
      key: "Amended commit on {branch}.", pattern: /^Amended\s+commit\s+on\s+(.+?)\.?$/i,
      replace: (_, b) => `已在 ${b} 上修正提交。`
    },
    {
      key: "Push {count} commits to {branch}", pattern: /^Push\s+(\d+)\s+commits?\s+to\s+(.+)$/i,
      replace: (_, n, b) => `推送 ${n} 个提交至 ${b}`
    },
    {
      key: "Pushed {count} commits to {branch}.", pattern: /^Pushed\s+(\d+)\s+commits?\s+to\s+(.+?)\.?$/i,
      replace: (_, n, b) => `已推送 ${n} 个提交至 ${b}。`
    },
    {
      key: "Pushed to {branch}.", pattern: /^Pushed\s+to\s+(.+?)\.?$/i,
      replace: (_, b) => `已推送至 ${b}。`
    },
    {
      key: "Publish {branch} to origin", pattern: /^Publish\s+(.+?)\s+to\s+origin$/i,
      replace: (_, b) => `将 ${b} 发布到远端 origin`
    },
    {
      key: "Published {branch} to origin.", pattern: /^Published\s+(.+?)\s+to\s+origin\.?$/i,
      replace: (_, b) => `已将 ${b} 发布到远端 origin。`
    },
    {
      key: "All changes since {ref}", pattern: /^All\s+changes\s+since\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, r) => `自 ${r} 以来的所有更改`
    },
    {
      key: "Delete workspace {name}", pattern: /^Delete\s+workspace\s+(.+)$/i,
      replace: (_, n) => `删除工作区 ${n}`
    },
    {
      key: "Deleted workspace {name}", pattern: /^Deleted\s+workspace\s+(.+)$/i,
      replace: (_, n) => `已删除工作区 ${n}`
    },
    {
      key: "Remount workspace {name}", pattern: /^Remount\s+workspace\s+(.+)$/i,
      replace: (_, n) => `重新挂载工作区 ${n}`
    },
    {
      key: "Remounted workspace {name}", pattern: /^Remounted\s+workspace\s+(.+)$/i,
      replace: (_, n) => `已重新挂载工作区 ${n}`
    },
    {
      key: "Unmount workspace {name}", pattern: /^Unmount\s+workspace\s+(.+)$/i,
      replace: (_, n) => `卸载工作区 ${n}`
    },
    {
      key: "Unmounted workspace {name}", pattern: /^Unmounted\s+workspace\s+(.+)$/i,
      replace: (_, n) => `已卸载工作区 ${n}`
    },
    {
      key: "Creating workspace \"{name}\"...", pattern: /^Creating\s+workspace\s+"(.+)"\.\.\.$/i,
      replace: (_, n) => `正在创建工作区“${n}”...`
    },
    {
      key: "Creating ABFS workspace {name}...", pattern: /^Creating\s+ABFS\s+workspace\s+(.+)\.\.\.$/i,
      replace: (_, n) => `正在创建 ABFS 工作区 ${n}...`
    },
    {
      key: "ABFS workspace {name} created and selected.", pattern: /^ABFS\s+workspace\s+(.+?)\s+created\s+and\s+selected\.?$/i,
      replace: (_, n) => `已创建并选中 ABFS 工作区 ${n}。`
    },
    {
      key: "Move to Group: {name}", pattern: /^Move\s+to\s+Group:\s*(.+)$/i,
      replace: (_, n) => `移动到分组：${n}`
    },
    {
      key: "Moved conversation {name}", pattern: /^Moved\s+conversation\s+(.+)$/i,
      replace: (_, n) => `已移动对话 ${n}`
    },
    {
      key: "Agent needs permission to execute JavaScript on {host}", pattern: /^Agent\s+needs\s+permission\s+to\s+execute\s+JavaScript\s+on\s+(.+)$/i,
      replace: (_, h) => `智能体需要权限才能在 ${h} 上执行 JavaScript`
    },
    {
      key: "Agent needs permission to act on {host}", pattern: /^Agent\s+needs\s+permission\s+to\s+act\s+on\s+(.+)$/i,
      replace: (_, h) => `智能体需要权限才能在 ${h} 上执行操作`
    },
    {
      key: "Yes, and always allow '{target}' in this conversation", pattern: /^Yes,\s*and\s+always\s+allow\s+'(.+)'\s+in\s+this\s+conversation$/i,
      replace: (_, t) => `是，并在此对话中始终允许 '${t}'`
    },
    {
      key: "Yes, and always allow '{target}' in this workspace", pattern: /^Yes,\s*and\s+always\s+allow\s+'(.+)'\s+in\s+this\s+workspace$/i,
      replace: (_, t) => `是，并在此工作区中始终允许 '${t}'`
    },
    {
      key: "Yes, allow {target} in this conversation", pattern: /^Yes,\s*allow\s+(.+?)\s+in\s+this\s+conversation$/i,
      replace: (_, t) => `是，在此对话中允许 ${t}`
    },
    {
      key: "Yes, always allow {target}", pattern: /^Yes,\s*always\s+allow\s+(.+)$/i,
      replace: (_, t) => `是，始终允许 ${t}`
    },
    {
      key: "Yes, save rule for '{target}' globally", pattern: /^Yes,\s*save\s+rule\s+for\s+'(.+)'\s+globally$/i,
      replace: (_, t) => `是，在全局保存 '${t}' 的规则`
    },
    {
      key: "Yes, save rule for '{target}' in this conversation", pattern: /^Yes,\s*save\s+rule\s+for\s+'(.+)'\s+in\s+this\s+conversation$/i,
      replace: (_, t) => `是，在此对话中保存 '${t}' 的规则`
    },
    {
      key: "Yes, save rule for '{target}' in this workspace", pattern: /^Yes,\s*save\s+rule\s+for\s+'(.+)'\s+in\s+this\s+workspace$/i,
      replace: (_, t) => `是，在此工作区中保存 '${t}' 的规则`
    },
    {
      key: "Save rule to always allow {target}?", pattern: /^Save\s+rule\s+to\s+always\s+allow\s+(.+?)\?$/i,
      replace: (_, t) => `是否保存规则以始终允许 ${t}？`
    },
    {
      key: "Review permissions for {target}", pattern: /^Review\s+permissions\s+for\s+(.+)$/i,
      replace: (_, t) => `审查 ${t} 的权限`
    },
    {
      key: "Requires manual confirmation: {reason}", pattern: /^Requires\s+manual\s+confirmation:\s*(.+)$/i,
      replace: (_, r) => `需要手动确认：${r}`
    },
    {
      key: "Conflicts with your configured Ask permission: {rule}", pattern: /^Conflicts\s+with\s+your\s+configured\s+Ask\s+permission:\s*(.+)$/i,
      replace: (_, r) => `与您配置的“询问”权限冲突：${r}`
    },
    {
      key: "Available AI Credits: {credits}", pattern: /^Available\s+AI\s+Credits:\s*(.+)$/i,
      replace: (_, c) => `可用 AI 额度：${c}`
    },
    {
      key: "Your plan's baseline quota will refresh on {date}.", pattern: /^Your\s+plan's\s+baseline\s+quota\s+will\s+refresh\s+on\s+(.+?)\.?$/i,
      replace: (_, d) => `您套餐的基础配额将于 ${d} 刷新。`
    },
    {
      key: "Your quota for {model} has been reached. Switch to another available model to continue.",
      pattern: /^Your\s+quota\s+for\s+(.+?)\s+has\s+been\s+reached\.\s*Switch\s+to\s+another\s+available\s+model\s+to\s+continue\.?$/i,
      replace: (_, m) => `您的 ${m} 配额已达上限。请切换到其他可用模型以继续。`
    },
    {
      key: "Your quota for {model} will reset on {date}. Switch to another available model to continue.",
      pattern: /^Your\s+quota\s+for\s+(.+?)\s+will\s+reset\s+on\s+(.+?)\.\s*Switch\s+to\s+another\s+available\s+model\s+to\s+continue\.?$/i,
      replace: (_, m, d) => `您的 ${m} 配额将于 ${d} 重置。请切换到其他可用模型以继续。`
    },
    {
      key: "You need {credits} AI Credits to send messages. To continue using {model} now, purchase more AI Credits.",
      pattern: /^You\s+need\s+(.+?)\s+AI\s+Credits\s+to\s+send\s+messages\.\s*To\s+continue\s+using\s+(.+?)\s+now,\s*purchase\s+more\s+AI\s+Credits\.?$/i,
      replace: (_, c, m) => `您需要 ${c} AI 额度才能发送消息。若要立即继续使用 ${m}，请购买更多 AI 额度。`
    },
    {
      key: "Model unavailable, retrying in {seconds}s{dots}", pattern: /^Model\s+unavailable,\s*retrying\s+in\s+(\d+)s(.*)$/i,
      replace: (_, s, rest) => `模型不可用，将在 ${s} 秒后重试${rest}`
    },
    {
      key: "Exceeded the customization token budget ({tokens} tokens) and was excluded from context.",
      pattern: /^Exceeded\s+the\s+customization\s+token\s+budget\s*\((.+?)\s+tokens?\)\s*and\s+was\s+excluded\s+from\s+context\.?$/i,
      replace: (_, t) => `已超出自定义项 Token 预算（${t} 个 Token），已从上下文中排除。`
    },
    {
      key: "Exceeded the rules token budget. Full rule content ({tokens} tokens) was replaced with a lightweight file-path pointer in context.",
      pattern: /^Exceeded\s+the\s+rules\s+token\s+budget\.\s*Full\s+rule\s+content\s*\((.+?)\s+tokens?\)\s*was\s+replaced\s+with\s+a\s+lightweight\s+file-path\s+pointer\s+in\s+context\.?$/i,
      replace: (_, t) => `已超出规则 Token 预算。完整规则内容（${t} 个 Token）在上下文中已替换为轻量级文件路径指针。`
    },
    {
      key: "All tools in this MCP server ({tokens} tokens) exceeded the customization budget and were excluded from context.",
      pattern: /^All\s+tools\s+in\s+this\s+MCP\s+server\s*\((.+?)\s+tokens?\)\s*exceeded\s+the\s+customization\s+budget\s+and\s+were\s+excluded\s+from\s+context\.?$/i,
      replace: (_, t) => `此 MCP 服务器中的所有工具（${t} 个 Token）均已超出自定义项预算，已从上下文中排除。`
    },
    {
      key: "{count} tools in this MCP server ({tokens} tokens) exceeded the customization budget and were excluded from context.",
      pattern: /^(\d+)\s+tools?\s+in\s+this\s+MCP\s+server\s*\((.+?)\s+tokens?\)\s*exceeded\s+the\s+customization\s+budget\s+and\s+were\s+excluded\s+from\s+context\.?$/i,
      replace: (_, n, t) => `此 MCP 服务器中的 ${n} 个工具（${t} 个 Token）已超出自定义项预算，已从上下文中排除。`
    },
    {
      key: "{count} rules exceeded the rules budget and were demoted from full inline content to a file-path pointer.",
      pattern: /^(\d+)\s+rules?\s+exceeded\s+the\s+rules\s+budget\s+and\s+(?:was|were)\s+demoted\s+from\s+full\s+inline\s+content\s+to\s+a\s+file-path\s+pointer\.?$/i,
      replace: (_, n) => `${n} 条规则已超出规则预算，已从完整内联内容降级为文件路径指针。`
    },
    {
      key: "Unused capacity: {tokens} tokens", pattern: /^Unused\s+capacity:\s*(.+?)\s+tokens?$/i,
      replace: (_, t) => `未使用的容量：${t} 个 Token`
    },
    {
      key: "Add ({count})", pattern: /^Add\s+\((\d+)\)$/i,
      replace: (_, n) => `添加 (${n})`
    },
    {
      key: "Add all · {count}", pattern: /^Add\s+all\s*·\s*(\d+)$/i,
      replace: (_, n) => `全部添加 · ${n}`
    },
    {
      key: "Comment ({count})", pattern: /^Comment\s+\((\d+)\)$/i,
      replace: (_, n) => `评论 (${n})`
    },
    {
      key: "Comment on page {page}", pattern: /^Comment\s+on\s+page\s+(\d+)$/i,
      replace: (_, p) => `在第 ${p} 页添加评论`
    },
    {
      key: "See all ({count})", pattern: /^See\s+all\s+\((\d+)\)$/i,
      replace: (_, n) => `查看全部 (${n})`
    },
    {
      key: "Send all ({count})", pattern: /^Send\s+all\s+\((\d+)\)$/i,
      replace: (_, n) => `全部发送 (${n})`
    },
    {
      key: "Reset {count} overrides", pattern: /^Reset\s+(\d+)\s+overrides?$/i,
      replace: (_, n) => `重置 ${n} 项覆盖配置`
    },
    {
      key: "View {count} side questions", pattern: /^View\s+(\d+)\s+side\s+questions?$/i,
      replace: (_, n) => `查看 ${n} 个侧边提问`
    },
    {
      key: "Open {name} skill", pattern: /^Open\s+(.+?)\s+skill$/i,
      replace: (_, n) => `打开 ${n} 技能`
    },
    {
      key: "Open the {name} plugin", pattern: /^Open\s+the\s+(.+?)\s+plugin$/i,
      replace: (_, n) => `打开 ${n} 插件`
    },
    {
      key: "Cancel Questionnaire and Stop the Agent ({shortcut})",
      pattern: /^Cancel\s+Questionnaire\s+and\s+Stop\s+the\s+Agent\s+\(([^)]+)\)$/i,
      replace: (_, s) => `取消问卷并停止智能体 (${s})`
    },
    {
      key: "{additions} lines added, {deletions} lines removed",
      pattern: /^(\d+)\s+lines?\s+added,\s*(\d+)\s+lines?\s+removed$/i,
      replace: (_, a, d) => `新增 ${a} 行，删除 ${d} 行`
    },
    {
      key: "{name} (Remote)",
      pattern: /^(.+?)\s+\(Remote\)$/i,
      replace: (_, name) => `${nestedLabel(name)}（远程）`
    },
    {
      key: "Account this MCP server uses: {name}",
      pattern: /^Account\s+this\s+MCP\s+server\s+uses:\s*(.+)$/i,
      replace: (_, name) => `此 MCP 服务器使用的账号：${name}`
    },
    {
      key: "Detached at {commit}",
      pattern: /^Detached\s+at\s+([0-9a-f]{7,40})$/i,
      replace: (_, commit) => `游离于 ${commit}`
    },
    {
      key: "Unfold lines {start}-{end}",
      pattern: /^Unfold\s+lines\s+(\d+)-(\d+)$/i,
      replace: (_, s, e) => `展开第 ${s}-${e} 行`
    },
    {
      key: "View Diff for {file}",
      pattern: /^View\s+Diff\s+for\s+(.+)$/i,
      replace: (_, f) => `查看 ${f} 的差异`
    },
    {
      key: "Version {version}",
      pattern: /^Version\s+(v?\d+\.\d+(?:\.\d+)*(?:-[\w.]+)?)$/i,
      replace: (_, v) => `版本 ${v}`
    },
    {
      key: "Preview unavailable — {reason}",
      pattern: /^Preview\s+unavailable\s+[—-]\s+(.+)$/i,
      replace: (_, r) => `预览不可用 — ${r}`
    },
    {
      key: "Open URL in system browser: {url}",
      pattern: /^Open\s+URL\s+in\s+system\s+browser:\s*(https?:\/\/.+)$/i,
      replace: (_, u) => `在系统浏览器中打开 URL：${u}`
    },
    {
      key: "Opens external link: {url}",
      pattern: /^Opens\s+external\s+link:\s*(https?:\/\/.+)$/i,
      replace: (_, u) => `打开外部链接：${u}`
    },
    {
      key: 'Created automation "{name}".',
      pattern: /^Created\s+automation\s+"(.+)"\.$/i,
      replace: (_, n) => `已创建自动化“${n}”。`
    },
    {
      key: "The folder “{name}” does not exist. Would you like to create it?",
      pattern: /^The\s+folder\s+[“"](.+?)[”"]\s+does\s+not\s+exist\.\s+Would\s+you\s+like\s+to\s+create\s+it\?$/i,
      replace: (_, n) => `文件夹“${n}”不存在，是否创建？`
    },
    {
      key: "This window's agents, files, and terminals are on {host}.",
      pattern: /^This\s+window's\s+agents,\s+files,\s+and\s+terminals\s+are\s+on\s+(.+?)\.$/i,
      replace: (_, h) => `此窗口的智能体、文件与终端运行于 ${h}。`
    },
    {
      key: "Stop {count} selected",
      pattern: /^Stop\s+(\d+)\s+selected$/i,
      replace: (_, n) => `停止已选中的 ${n} 项`
    },
    {
      key: "⚠️ Failed to render LaTeX: {reason}",
      pattern: /^⚠️\s*Failed\s+to\s+render\s+LaTeX:\s*(.+)$/i,
      replace: (_, r) => `⚠️ LaTeX 渲染失败：${r}`
    },
    {
      key: "⚠️ Failed to render Mermaid diagram: {reason}",
      pattern: /^⚠️\s*Failed\s+to\s+render\s+Mermaid\s+diagram:\s*(.+)$/i,
      replace: (_, r) => `⚠️ Mermaid 图表渲染失败：${r}`
    },
    {
      key: "Agent: {name}",
      pattern: /^Agent:\s*(.+)$/i,
      replace: (_, n) => `智能体：${n}`
    },
    {
      key: "Agent ID: {id}",
      pattern: /^Agent\s+ID:\s*(.+)$/i,
      replace: (_, id) => `智能体 ID：${id}`
    },
    {
      key: "Error: {message}",
      pattern: /^Error:\s*(.+)$/i,
      replace: (_, m) => `错误：${m}`
    },
    {
      key: "Error ID: {id}",
      pattern: /^Error\s+ID:\s*(.+)$/i,
      replace: (_, id) => `错误 ID：${id}`
    },
    {
      key: "Working directory: {path}",
      pattern: /^Working\s+directory:\s*(.+)$/i,
      replace: (_, p) => `工作目录：${p}`
    },
    {
      key: "Side Question: {title}",
      pattern: /^Side\s+Question:\s*(.+)$/i,
      replace: (_, t) => `侧边提问：${t}`
    },
    {
      key: "Delete side question: {title}",
      pattern: /^Delete\s+side\s+question:\s*(.+)$/i,
      replace: (_, t) => `删除侧边提问：${t}`
    },
    {
      key: "Edit side question title: {title}",
      pattern: /^Edit\s+side\s+question\s+title:\s*(.+)$/i,
      replace: (_, t) => `编辑侧边提问标题：${t}`
    },
    {
      key: "Couldn't connect to {target}",
      pattern: /^Couldn['’]t\s+connect\s+to\s+(.+)$/i,
      replace: (_, t) => `无法连接到 ${t}`
    },
    {
      key: "Couldn't switch accounts: {reason}",
      pattern: /^Couldn['’]t\s+switch\s+accounts:\s*(.+)$/i,
      replace: (_, r) => `无法切换账号：${r}`
    },
    {
      key: "Unable to load PDF: {reason}",
      pattern: /^Unable\s+to\s+load\s+PDF:\s*(.+)$/i,
      replace: (_, r) => `无法加载 PDF：${r}`
    },
    {
      key: "List resources: {server}",
      pattern: /^List\s+resources:\s*(.+)$/i,
      replace: (_, s) => `列出资源：${s}`
    },
    {
      key: "Read resource: {uri}",
      pattern: /^Read\s+resource:\s*(.+)$/i,
      replace: (_, u) => `读取资源：${u}`
    },
    {
      key: "Commented on: {target}",
      pattern: /^Commented\s+on:\s*(.+)$/i,
      replace: (_, t) => `已评论：${t}`
    },
    {
      key: "SSH config: {path}",
      pattern: /^SSH\s+config:\s*(.+)$/i,
      replace: (_, p) => `SSH 配置：${p}`
    },
    {
      key: "Domains: {domains}",
      pattern: /^Domains:\s*(.+)$/i,
      replace: (_, d) => `域名：${d}`
    },
    {
      key: "Location: {location}",
      pattern: /^Location:\s*(.+)$/i,
      replace: (_, l) => `位置：${l}`
    },
    {
      key: "Payload: {payload}",
      pattern: /^Payload:\s*(.+)$/i,
      replace: (_, p) => `载荷：${p}`
    },
    {
      key: "Project ID: {id}",
      pattern: /^Project\s+ID:\s*(.+)$/i,
      replace: (_, id) => `项目 ID：${id}`
    },
    {
      key: "Used for: {purpose}",
      pattern: /^Used\s+for:\s*(.+)$/i,
      replace: (_, p) => `用途：${p}`
    },
    {
      key: "Invalid embed: {url}",
      pattern: /^Invalid\s+embed:\s*(.+)$/i,
      replace: (_, u) => `无效的嵌入内容：${u}`
    },
    {
      key: "Blocked: {reason}",
      pattern: /^Blocked:\s*(.+)$/i,
      replace: (_, r) => `已阻止：${r}`
    },
    {
      key: "Your Plan: {plan}",
      pattern: /^Your\s+Plan:\s*(.+)$/i,
      replace: (_, p) => `当前套餐：${nestedLabel(p)}`
    },
    {
      key: "Switch environment ({env})",
      pattern: /^Switch\s+environment\s*\((.+)\)$/i,
      replace: (_, e) => `切换环境 (${e})`
    },
    {
      key: "System default ({name})",
      pattern: /^System\s+default\s*\((.+)\)$/i,
      replace: (_, n) => `系统默认 (${nestedLabel(n)})`
    },
    {
      key: "Cost summary: {summary}",
      pattern: /^Cost\s+summary:\s*(.+)$/i,
      replace: (_, s) => `费用摘要：${s}`
    },
    {
      key: "Sort and filter conversations ({count} active)",
      pattern: /^Sort\s+and\s+filter\s+conversations\s*\((\d+)\s+active\)$/i,
      replace: (_, n) => `排序与筛选对话（${n} 个活跃）`
    },
    {
      key: "Worker sandbox initialization failed: {reason}",
      pattern: /^Worker\s+sandbox\s+initialization\s+failed:\s*(.+)$/i,
      replace: (_, r) => `工作区沙箱初始化失败：${r}`
    },
    {
      key: "Authorization code for {target}",
      pattern: /^Authorization\s+code\s+for\s+(.+)$/i,
      replace: (_, t) => `${t} 的授权码`
    },
    {
      key: "Auth code for {target}",
      pattern: /^Auth\s+code\s+for\s+(.+)$/i,
      replace: (_, t) => `${t} 的授权码`
    },
    {
      key: "Welcome to {name}!",
      pattern: /^Welcome\s+to\s+(.+?)!$/i,
      replace: (_, n) => `欢迎使用 ${n}！`
    },
    {
      key: "Welcome back, {name}. Where should we pick up?",
      pattern: /^Welcome back, ([^\r\n]{1,80})\. Where should we pick up\?$/i,
      guard: (el) => Boolean(el?.closest?.('h1,h2,[role="heading"]')),
      replace: (_, name) => `欢迎回来，${name}。今天想从哪里开始？`
    },
    {
      key: "Loading {name}...",
      pattern: /^Loading\s+(.+?)(?:\.\.\.|…)$/i,
      replace: (_, n) => `正在加载 ${nestedLabel(n)}...`
    },
    {
      key: 'Restarted "{name}".',
      pattern: /^Restarted\s+"(.+)"\.$/i,
      replace: (_, n) => `已重启“${n}”。`
    },
    {
      key: 'Started "{name}".',
      pattern: /^Started\s+"(.+)"\.$/i,
      replace: (_, n) => `已启动“${n}”。`
    },
    {
      key: 'Enabled "{name}".',
      pattern: /^Enabled\s+"(.+)"\.$/i,
      replace: (_, n) => `已启用“${n}”。`
    },
    {
      key: 'Deleted "{name}".',
      pattern: /^Deleted\s+"(.+)"\.$/i,
      replace: (_, n) => `已删除“${n}”。`
    },
    {
      key: "Using browser · {detail}",
      pattern: /^Using\s+browser\s*·\s*(.+)$/i,
      replace: (_, d) => `使用浏览器 · ${nestedLabel(d)}`
    },
    {
      key: "Running for {duration}",
      pattern: /^Running\s+for\s+(\d+\s*[hms](?:\s+\d+\s*[hms])*|<1s)$/i,
      replace: (_, d) => `已运行 ${formatDuration(d)}`
    },
    {
      key: "Up {duration}",
      pattern: /^Up\s+(\d+\s*[hms](?:\s+\d+\s*[hms])*)$/i,
      replace: (_, d) => `已运行 ${formatDuration(d)}`
    },
    {
      key: "You have {count} conversations in progress. Updating will cancel them and you'll need to manually restart them.",
      pattern: /^You\s+have\s+(\d+)\s+conversations?\s+in\s+progress\.\s*Updating\s+will\s+cancel\s+them\s+and\s+you'll\s+need\s+to\s+manually\s+restart\s+them\.?$/i,
      replace: (_, n) => `您当前有 ${n} 个对话正在进行。更新将取消这些对话，更新后需要手动重新启动。`
    },
    {
      key: "You have {count} conversations in progress. Updating will interrupt them, and they will automatically resume once the update completes.",
      pattern: /^You\s+have\s+(\d+)\s+conversations?\s+in\s+progress\.\s*Updating\s+will\s+interrupt\s+them,\s+and\s+they\s+will\s+automatically\s+resume\s+once\s+the\s+update\s+completes\.?$/i,
      replace: (_, n) => `您当前有 ${n} 个对话正在进行。更新将暂时中断它们，并在更新完成后自动恢复。`
    },
    {
      key: "Hide {host} from this list",
      pattern: /^Hide\s+(.+?)\s+from\s+this\s+list$/i,
      replace: (_, h) => `从列表中隐藏 ${h}`
    },
    {
      key: "Show {host} in the list again",
      pattern: /^Show\s+(.+?)\s+in\s+the\s+list\s+again$/i,
      replace: (_, h) => `在列表中重新显示 ${h}`
    },
    // 13. 2.33.0 新增动态模板规则
    {
      key: "Plan, {done} of {total} steps done",
      pattern: /^Plan,\s*(\d+)\s+of\s+(\d+)\s+steps?\s+done$/i,
      replace: (_, done, total) => `规划进度：已完成 ${done} / ${total} 步`
    },
    {
      key: "Step {current} of {total}",
      pattern: /^Step\s+(\d+)\s+of\s+(\d+)$/i,
      replace: (_, current, total) => `第 ${current} / ${total} 步`
    },
    {
      key: "{count} cookies",
      pattern: /^(\d+)\s+cookies?$/i,
      replace: (_, n) => `${n} 个 Cookie`
    },
    {
      key: "Delete cookies for {site}",
      pattern: /^Delete\s+cookies\s+for\s+(.+)$/i,
      replace: (_, site) => `删除 ${site} 的 Cookie`
    },
    {
      key: "Add bundle {name}",
      pattern: /^Add\s+bundle\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, name) => `添加扩展包 ${name}`
    },
    {
      key: "Adding plugins from {source}",
      pattern: /^Adding\s+plugins\s+from\s+(.+)$/i,
      replace: (_, source) => `正在从 ${source} 添加插件`
    },
    {
      key: "Retrying transcription (attempt {attempt})…",
      pattern: /^Retrying\s+transcription\s*\(attempt\s+(\d+)\)(?:\u2026|\.\.\.)?$/i,
      replace: (_, n) => `正在重试语音转写（第 ${n} 次尝试）…`
    },
    {
      key: "The preview did not respond on port {port}.",
      pattern: /^The\s+preview\s+did\s+not\s+respond\s+on\s+port\s+(\d+)\.?$/i,
      replace: (_, port) => `端口 ${port} 上的预览未响应。`
    },
    {
      key: "These plugins in {source} may have looser code review. Review their contents before adding the bundle.",
      pattern: /^Th(is|ese)\s+plugins?\s+in\s+(.+?)\s+may\s+have\s+looser\s+code\s+review\.\s*Review\s+(?:its|their)\s+contents\s+before\s+adding\s+the\s+bundle\.?$/i,
      replace: (_, kind, source) => `${source} 中的${kind.toLowerCase() === 'is' ? '此' : '这些'}插件可能代码审查较宽松。添加扩展包前请先检查其内容。`
    },
    {
      key: "Low contrast ratio ({ratio}:1). Text may be hard to read.",
      pattern: /^Low\s+contrast\s+ratio\s*\(([\d.]+:1)\)\.\s*Text\s+may\s+be\s+hard\s+to\s+read\.?$/i,
      replace: (_, ratio) => `对比度较低（${ratio}），文字可能不易辨认。`
    },
    {
      key: "Can’t create this path — “{path}” is a file, not a folder.",
      pattern: /^Can['’]t\s+create\s+this\s+path\s+[—-]\s+[“"](.+?)[”"]\s+is\s+a\s+file,\s*not\s+a\s+folder\.?$/i,
      replace: (_, p) => `无法创建此路径 — “${p}”是文件，而非文件夹。`
    },
    {
      key: "You're signing in on {host}. Your sign-in stays on that machine.",
      pattern: /^You['’]re\s+signing\s+in\s+on\s+(.+?)\.\s*Your\s+sign-in\s+stays\s+on\s+that\s+machine\.?$/i,
      replace: (_, host) => `您正在 ${host} 上登录。您的登录状态仅保留在该设备上。`
    },
    {
      key: "{label}, {count} grants",
      pattern: /^(.+?),\s*(\d+)\s+grants?$/i,
      replace: (_, label, n) => `${nestedLabel(label)}，${n} 项授权`
    },
    {
      key: "{count} folders in this project could not be loaded because their locations are invalid.",
      pattern: /^(\d+)\s+folders?\s+in\s+this\s+project\s+could\s+not\s+be\s+loaded\s+because\s+(?:its|their)\s+locations?\s+(?:is|are)\s+invalid\.?$/i,
      replace: (_, n) => `此项目中有 ${n} 个文件夹因其位置无效而无法加载。`
    },
    {
      key: "{error} ({count} folders were cloned before the failure)",
      pattern: /^(.+?)\s*\((\d+)\s+(?:folder\s+was|folders\s+were)\s+cloned\s+before\s+the\s+failure\)\.?$/i,
      replace: (_, err, n) => `${nestedLabel(err)}（失败前已克隆 ${n} 个文件夹）`
    },
    {
      key: "Honors standard VS Code shortcuts without collisions (e.g. {shortcuts}).",
      pattern: /^Honors\s+standard\s+VS\s+Code\s+shortcuts\s+without\s+collisions\s+\(e\.g\.\s+(.+?)\)\.?$/i,
      replace: (_, s) => `遵循标准 VS Code 快捷键且无冲突（例如：${translateKeybindingExamples(s)}）。`
    },
    {
      key: "Uses standalone Antigravity chords (e.g. {shortcuts}). Replaces Go to Symbol ({symbol}) and Trigger Suggest ({suggest}), and rebinds VS Code Settings to {settings}.",
      pattern: /^Uses\s+standalone\s+Antigravity\s+chords\s+\(e\.g\.\s+(.+?)\)\.\s*Replaces\s+Go\s+to\s+Symbol\s+\(([^)]+)\)\s+and\s+Trigger\s+Suggest\s+\(([^)]+)\),\s*and\s+rebinds\s+VS\s+Code\s+Settings\s+to\s+(.+?)\.?$/i,
      replace: (_, s, sym, sug, cfg) =>
        `使用独立 Antigravity 组合快捷键（例如：${translateKeybindingExamples(s)}）。将替代转到符号 (${sym}) 与触发建议 (${sug})，并将 VS Code 设置重新绑定至 ${cfg}。`
    },
    // 14. 2.33.0 SSH 远程主机状态与连接进度动态模板（具体长句须先于泛化 Connecting to）
    {
      key: "Connected to {host}",
      pattern: /^Connected\s+to\s+(.+)$/i,
      replace: (_, h) => `已连接到 ${h}`
    },
    {
      key: "SSH Config ({name})",
      pattern: /^SSH\s+Config\s*\((.+)\)$/i,
      replace: (_, n) => `SSH 配置（${n}）`
    },
    {
      key: "{count} hidden hosts",
      pattern: /^(\d+)\s+hidden\s+hosts?$/i,
      replace: (_, n) => `${n} 个已隐藏主机`
    },
    {
      key: "No hosts in {file} yet. Type one above.",
      pattern: /^No\s+hosts\s+in\s+(.+?)\s+yet\.\s*Type\s+one\s+above\.?$/i,
      replace: (_, f) => `${f} 中暂无主机，请在上方输入。`
    },
    {
      key: "Remove {host} from Recent",
      pattern: /^Remove\s+(.+?)\s+from\s+Recent$/i,
      replace: (_, h) => `从最近项中移除 ${h}`
    },
    {
      key: "Waiting for the sign-in callback on port {port}.",
      pattern: /^Waiting\s+for\s+the\s+sign-in\s+callback\s+on\s+port\s+(\d+)\.?$/i,
      replace: (_, p) => `正在等待端口 ${p} 上的登录回调。`
    },
    {
      key: "Waiting for another window to finish installing on {host}…",
      pattern: /^Waiting\s+for\s+another\s+window\s+to\s+finish\s+installing\s+on\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在等待另一窗口完成在 ${h} 上的安装…`
    },
    {
      key: "Downloading the Antigravity server on {host}…",
      pattern: /^Downloading\s+the\s+Antigravity\s+server\s+on\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在 ${h} 上下载 Antigravity 服务…`
    },
    {
      key: "Uploading the Antigravity server to {host}…",
      pattern: /^Uploading\s+the\s+Antigravity\s+server\s+to\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在向 ${h} 上传 Antigravity 服务…`
    },
    {
      key: "Starting the Antigravity server on {host}…",
      pattern: /^Starting\s+the\s+Antigravity\s+server\s+on\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在 ${h} 上启动 Antigravity 服务…`
    },
    {
      key: "Connecting to the running server on {host}…",
      pattern: /^Connecting\s+to\s+the\s+running\s+server\s+on\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在连接到 ${h} 上运行中的服务…`
    },
    {
      key: "Restarting the Antigravity server on {host}…",
      pattern: /^Restarting\s+the\s+Antigravity\s+server\s+on\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在重启 ${h} 上的 Antigravity 服务…`
    },
    {
      key: "Connecting to the Antigravity server on {host}…",
      pattern: /^Connecting\s+to\s+the\s+Antigravity\s+server\s+on\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在连接到 ${h} 上的 Antigravity 服务…`
    },
    {
      key: "Checking {host}…",
      pattern: /^Checking\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在检查 ${h}…`
    },
    {
      key: "Connecting to {host}…",
      pattern: /^Connecting\s+to\s+(.+?)(?:\u2026|\.\.\.)$/i,
      replace: (_, h) => `正在连接到 ${h}…`
    },
    // 15. 2.34.0 新增动态模板与内联整句模板（Screen Recording、遥测、子智能体、自动换行、保存报错等）
    {
      key: "In System Settings, turn on {0}. If it isn't in the list, drag it in from the small window next to System Settings. Already on? Select {1}, click {2}, then drag it back in from the small window.",
      pattern: /^In\s+System\s+Settings,\s*turn\s+on\s+\{(\d+)\}\.\s*If\s+it\s+isn['’]t\s+in\s+the\s+list,\s*drag\s+it\s+in\s+from\s+the\s+small\s+window\s+next\s+to\s+System\s+Settings\.\s*Already\s+on\?\s*Select\s+\{(\d+)\},\s*click\s+\{(\d+)\},\s*then\s+drag\s+it\s+back\s+in\s+from\s+the\s+small\s+window\.?$/i,
      replace: (_, a, b, c) => `请在系统设置中开启 {${a}}。如果列表中没有它，请从系统设置旁的小窗口将其拖入。已开启？选中 {${b}}，点击 {${c}}，然后从小窗口将其重新拖入。`
    },
    {
      key: "In System Settings, turn on {0}. If it isn't in the list, drag it in from the small window next to System Settings.",
      pattern: /^In\s+System\s+Settings,\s*turn\s+on\s+\{(\d+)\}\.\s*If\s+it\s+isn['’]t\s+in\s+the\s+list,\s*drag\s+it\s+in\s+from\s+the\s+small\s+window\s+next\s+to\s+System\s+Settings\.?$/i,
      replace: (_, a) => `请在系统设置中开启 {${a}}。如果列表中没有它，请从系统设置旁的小窗口将其拖入。`
    },
    {
      key: "In System Settings, click {0}, choose {1}, then turn it on. Already on? Select {2}, click {3}, then click {4} and add it again.",
      pattern: /^In\s+System\s+Settings,\s*click\s+\{(\d+)\},\s*choose\s+\{(\d+)\},\s*then\s+turn\s+it\s+on\.\s*Already\s+on\?\s*Select\s+\{(\d+)\},\s*click\s+\{(\d+)\},\s*then\s+click\s+\{(\d+)\}\s+and\s+add\s+it\s+again\.?$/i,
      replace: (_, a, b, c, d, e) => `请在系统设置中点击 {${a}}，选择 {${b}}，然后开启它。已开启？选中 {${c}}，点击 {${d}}，然后点击 {${e}} 重新添加。`
    },
    {
      key: "In System Settings, click {0}, choose {1}, then turn it on.",
      pattern: /^In\s+System\s+Settings,\s*click\s+\{(\d+)\},\s*choose\s+\{(\d+)\},\s*then\s+turn\s+it\s+on\.?$/i,
      replace: (_, a, b) => `请在系统设置中点击 {${a}}，选择 {${b}}，然后开启它。`
    },
    {
      key: "Relaunch {app} to finish Screen Recording.",
      pattern: /^Relaunch\s+(.+?)\s+to\s+finish\s+Screen\s+Recording\.?$/i,
      replace: (_, app) => `重新启动 ${app} 以完成屏幕录制配置。`
    },
    {
      key: "Telemetry is turned off for your account. {product} does not collect any of your prompts, content, or model responses but will still collect general usage patterns (e.g., feature adoption, active user counts).",
      pattern: /^Telemetry\s+is\s+turned\s+off\s+for\s+your\s+account\.\s*(?:This\s+means\s+)?(.+?)\s+does\s+not\s+collect\s+any\s+of\s+your\s+prompts,\s*content,\s*or\s+model\s+responses,?\s*but\s+will\s+still\s+collect\s+general\s+usage\s+patterns\s*\(e\.g\.,\s*feature\s+adoption,\s*active\s+user\s+counts\)\.?$/i,
      replace: (_, product) => `您的账号已关闭遥测。${product} 不会收集您的任何提示词、内容或模型回复，但仍会收集常规使用模式（例如功能采用率、活跃用户数）。`
    },
    {
      key: "{product} does not collect any of your prompts, content, or model responses but does collect general usage patterns such as feature adoption and active user counts (“product analytics”). Telemetry data will be handled in accordance with the Google Privacy Policy.",
      pattern: /^(.+?)\s+does\s+not\s+collect\s+any\s+of\s+your\s+prompts,\s*content,\s*or\s+model\s+responses\s+but\s+does\s+collect\s+general\s+usage\s+patterns\s+such\s+as\s+feature\s+adoption\s+and\s+active\s+user\s+counts\s*\([“"]product\s+analytics[”"]\)\.\s*Telemetry\s+data\s+will\s+be\s+handled\s+in\s+accordance\s+with\s+the\s+Google\s+Privacy\s+Policy\.?$/i,
      replace: (_, product) => `${product} 不会收集您的任何提示词、内容或模型回复，但会收集常规使用模式，例如功能采用率与活跃用户数（“产品分析”）。遥测数据将按照 Google 隐私政策处理。`
    },
    {
      key: "When toggled on, {product} collects usage data to help Google enhance performance and features.",
      pattern: /^When\s+toggled\s+on,\s*(.+?)\s+collects\s+usage\s+data\s+to\s+help\s+Google\s+enhance\s+performance\s+and\s+features\.?$/i,
      replace: (_, product) => `开启后，${product} 将收集使用数据，以帮助 Google 提升性能与功能体验。`
    },
    {
      key: "Receive product updates, tips, and promotions from Google {product} via email.",
      pattern: /^Receive\s+product\s+updates,\s*tips,\s*and\s+promotions\s+from\s+Google\s+(.+?)\s+via\s+email\.?$/i,
      replace: (_, product) => `通过电子邮件接收来自 Google ${product} 的产品动态、使用技巧与推广通知。`
    },
    {
      key: "Show {count} more subagents",
      pattern: /^Show\s+(\d+)\s+more\s+subagents?$/i,
      replace: (_, n) => `显示另外 ${n} 个子智能体`
    },
    {
      key: "Enable Word Wrap ({shortcut})",
      pattern: /^Enable\s+Word\s+Wrap(?:\s+(\([^)]+\)))?$/i,
      replace: (_, s) => `开启自动换行${s ? ' ' + s : ''}`
    },
    {
      key: "Disable Word Wrap ({shortcut})",
      pattern: /^Disable\s+Word\s+Wrap(?:\s+(\([^)]+\)))?$/i,
      replace: (_, s) => `关闭自动换行${s ? ' ' + s : ''}`
    },
    {
      key: "Toggle Word Wrap ({shortcut})",
      pattern: /^Toggle\s+Word\s+Wrap(?:\s+(\([^)]+\)))?$/i,
      replace: (_, s) => `切换自动换行${s ? ' ' + s : ''}`
    },
    {
      key: "Failed to save cloud permission settings: {reason}",
      pattern: /^Failed\s+to\s+save\s+cloud\s+permission\s+settings:\s*(.+)$/i,
      replace: (_, r) => `保存云端权限设置失败：${r}`
    },
    {
      key: "Failed to save project Google3 configuration: {reason}",
      pattern: /^Failed\s+to\s+save\s+project\s+Google3\s+configuration:\s*(.+)$/i,
      replace: (_, r) => `保存项目 Google3 配置失败：${r}`
    },
    {
      key: "Failed to save project permissions: {reason}",
      pattern: /^Failed\s+to\s+save\s+project\s+permissions:\s*(.+)$/i,
      replace: (_, r) => `保存项目权限失败：${r}`
    },
    {
      key: "Failed to save project settings: {reason}",
      pattern: /^Failed\s+to\s+save\s+project\s+settings:\s*(.+)$/i,
      replace: (_, r) => `保存项目设置失败：${r}`
    },
    {
      key: "Failed to save project: {reason}",
      pattern: /^Failed\s+to\s+save\s+project:\s*(.+)$/i,
      replace: (_, r) => `保存项目失败：${r}`
    },
    {
      key: "Failed to save settings: {reason}",
      pattern: /^Failed\s+to\s+save\s+settings:\s*(.+)$/i,
      replace: (_, r) => `保存设置失败：${r}`
    },
    {
      key: "Failed to create project: {reason}",
      pattern: /^Failed\s+to\s+create\s+project:\s*(.+)$/i,
      replace: (_, r) => `创建项目失败：${r}`
    },
    {
      key: "Failed to unarchive project: {reason}",
      pattern: /^Failed\s+to\s+unarchive\s+project:\s*(.+)$/i,
      replace: (_, r) => `取消归档项目失败：${r}`
    },
    {
      key: "Failed to delete recordings: {reason}",
      pattern: /^Failed\s+to\s+delete\s+recordings:\s*(.+)$/i,
      replace: (_, r) => `删除录制文件失败：${r}`
    },
    {
      key: "Failed to resolve folder: {path} ({reason})",
      pattern: /^Failed\s+to\s+resolve\s+folder:\s*(.+?)\s+\((.+)\)$/i,
      replace: (_, p, r) => `无法解析文件夹：${p}（${r}）`
    },
    {
      key: "Failed to load page {page}: {reason}",
      pattern: /^Failed\s+to\s+load\s+page\s+(\d+):\s*(.+)$/i,
      replace: (_, p, r) => `加载第 ${p} 页失败：${r}`
    },
    {
      key: 'Cannot add folder: "{path}" is not a valid folder location.',
      pattern: /^Cannot\s+add\s+folder:\s*[“"](.+?)[”"]\s+is\s+not\s+a\s+valid\s+folder\s+location\.?$/i,
      replace: (_, p) => `无法添加文件夹：“${p}”不是有效的文件夹位置。`
    },
    {
      key: "A file already exists at {path}.",
      pattern: /^A\s+file\s+already\s+exists\s+at\s+(.+?)\.?$/i,
      replace: (_, p) => `${p} 处已存在同名文件。`
    },
    {
      key: "Couldn't disconnect {target}: {reason}",
      pattern: /^Couldn['’]t\s+disconnect\s+(.+?):\s*(.+)$/i,
      replace: (_, t, r) => `无法断开 ${t}：${r}`
    },
    {
      key: "Configure {server}",
      pattern: /^Configure\s+([^.!?;:{}\n()]{1,80})$/i,
      guard: (_el, m) => isEntityNameSlot(m[1], 4),
      replace: (_, s) => `配置 ${s}`
    },
    {
      key: "More options for {title}",
      pattern: /^More\s+options\s+for\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, t) => `${t} 的更多选项`
    },
    {
      key: "Forked from {source}",
      pattern: /^Forked\s+from\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, s) => `复刻自 ${s}`
    },
    {
      key: "Make {account} the default {provider} account",
      pattern: /^Make\s+(.+?)\s+the\s+default\s+(.+?)\s+account$/i,
      replace: (_, a, p) => `将 ${a} 设为默认 ${p} 账号`
    },
    {
      key: "Secret for a new {provider} account",
      pattern: /^Secret\s+for\s+a\s+new\s+(.+?)\s+account$/i,
      replace: (_, p) => `新 ${p} 账号的密钥`
    },
    {
      key: "Secret for {provider}",
      pattern: /^Secret\s+for\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, p) => `${p} 的密钥`
    },
    {
      key: "New secret for {account}",
      pattern: /^New\s+secret\s+for\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, a) => `${a} 的新密钥`
    },
    {
      key: "See more in {name}",
      pattern: /^See\s+more\s+in\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, n) => `在 ${nestedLabel(n)} 中查看更多`
    },
    {
      key: "See less in {name}",
      pattern: /^See\s+less\s+in\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, n) => `在 ${nestedLabel(n)} 中收起部分内容`
    },
    {
      key: "Sign in from the {panel} panel.",
      pattern: /^Sign\s+in\s+from\s+the\s+(.+?)\s+panel\.?$/i,
      replace: (_, p) => `请从 ${p} 面板登录。`
    },
    {
      key: "Sign in to use {name}!",
      pattern: /^Sign\s+in\s+to\s+use\s+(.+?)!$/i,
      replace: (_, n) => `登录以使用 ${n}！`
    },
    {
      key: "{label}, error",
      pattern: /^(.+?),\s*error$/i,
      replace: (_, label) => `${nestedLabel(label)}（出错）`
    },
    {
      key: "{name}, voice {current} of {total}",
      pattern: /^(.+?),\s*voice\s+(\d+)\s+of\s+(\d+)$/i,
      replace: (_, n, c, t) => `${n}，第 ${c} / ${t} 个语音`
    },
    {
      key: "Line {from} → {to}",
      pattern: /^Line\s+(\d+)\s*→\s*(\d+)$/i,
      replace: (_, a, b) => `第 ${a} → ${b} 行`
    },
    {
      key: "Image: {name}",
      pattern: /^Image:\s*(.+)$/i,
      replace: (_, n) => `图片：${n}`
    },
    {
      key: "Pin Entire {target}",
      pattern: /^Pin\s+Entire\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, t) => `固定整个 ${nestedLabel(t)}`
    },
    {
      key: "Unpin {target}",
      pattern: /^Unpin\s+([^.?!{}\n]{1,80})$/i,
      replace: (_, t) => `取消固定 ${nestedLabel(t)}`
    },
    {
      key: "Opens the New Conversation screen for this {target}",
      pattern: /^Opens\s+the\s+New\s+Conversation\s+screen\s+for\s+this\s+(.+)$/i,
      replace: (_, t) => `打开此${nestedLabel(t)}的新建对话界面`
    },
    {
      key: "{count} days",
      pattern: /^(\d+)\s+days?$/i,
      replace: (_, n) => `${n} 天`
    },
    {
      key: "{count} CEL values",
      pattern: /^(\d+)\s+CEL\s+values?$/i,
      replace: (_, n) => `${n} 个 CEL 值`
    }
  ];

  function translateKeybindingExamples(text) {
    return String(text || '')
      .replace(/\bFocus Input\b/g, '聚焦输入框')
      .replace(/\bNew Conversation\b/g, '新建对话')
      .replace(/\bPicker in chat\b/g, '对话内选择器')
      .replace(/\bPicker\b/g, '选择器')
      .replace(/\bSettings\b/g, '设置')
      .replace(/\bHistory\b/g, '历史记录')
      .replace(/,\s+/g, '，');
  }

  for (const rule of TEMPLATE_RULES) {
    rule.inlineOnly = /\{\d+\}/.test(rule.key);
  }
  function matchTemplate(key, el) {
    if (isElapsedDurationNode(el) && /^\d+\s*(?:d|h|m|s|ms)(?:\s+\d+\s*(?:h|m|s|ms))*$/i.test(key)) {
      lastMatchedKeys = ['{duration}'];
      return formatDuration(key);
    }
    const hasInlineSlot = /\{\d+\}/.test(key);
    for (let i = 0; i < customTemplateRules.length; i++) {
      const rule = customTemplateRules[i];
      if (Boolean(rule.inlineOnly) !== hasInlineSlot) continue;
      if (!rule.pattern.test(key)) continue;
      const replaced = key.replace(rule.pattern, rule.replace);
      if (!hasInlineSlot && /\{\d+\}/.test(replaced)) continue;
      lastMatchedKeys = [rule.key];
      return replaced;
    }
    for (let i = 0; i < TEMPLATE_RULES.length; i++) {
      const rule = TEMPLATE_RULES[i];
      if (Boolean(rule.inlineOnly) !== hasInlineSlot) continue;
      const match = key.match(rule.pattern);
      if (!match) continue;
      if (rule.guard && !rule.guard(el, match)) continue;
      const replaced = key.replace(rule.pattern, rule.replace);
      if (!hasInlineSlot && /\{\d+\}/.test(replaced)) continue;
      lastMatchedKeys = [rule.key];
      return replaced;
    }
    return undefined;
  }

  function translateSshErrorText(original, el) {
    lastMatchedKeys = [];
    const lines = String(original).split('\n');
    let changed = false;
    const out = lines.map((rawLine) => {
      const lead = rawLine.match(/^\s*/)[0];
      const tail = rawLine.match(/\s*$/)[0];
      const trimmed = rawLine.trim();
      if (!trimmed || /^Logs:\s+\S+/i.test(trimmed)) return rawLine;
      const codeMatch = trimmed.match(/^([A-Z][A-Z0-9_]{2,}:\s+)([\s\S]+)$/);
      const codePrefix = codeMatch ? codeMatch[1] : '';
      const body = codeMatch ? codeMatch[2] : trimmed;
      const reportedMatch = body.match(/^(.+?)\s+reported:\s*([\s\S]*)$/);
      if (reportedMatch) {
        lastMatchedKeys.push('{host} reported: {detail}');
        changed = true;
        return `${lead}${codePrefix}${reportedMatch[1]} 返回：${reportedMatch[2]}${tail}`;
      }
      const normBody = normalize(body);
      if (!normBody || /(?:https?:\/\/|^(?:\/|~\/|[A-Za-z]:\\))/.test(normBody)) return rawLine;
      let val = entryFor(normBody);
      if (val !== undefined) {
        lastMatchedKeys.push(normBody);
      } else {
        val = matchTemplate(normBody, el);
      }
      if (val !== undefined && val !== body) {
        changed = true;
        return `${lead}${codePrefix}${val}${tail}`;
      }
      return rawLine;
    });
    return changed ? out.join('\n') : original;
  }

  function translation(original,el,kind) {
    lastMatchedKeys=[];
    const key = normalize(original);
    if (el?.closest?.('[data-testid="ssh-config-file-name"],[data-testid="ssh-config-file"]') && /\s+\(default\)$/i.test(key)) {
      const localized = original.replace(/\s+\(default\)(\s*)$/i, '（默认）$1');
      if (localized !== original) { lastMatchedKeys = ['{name} (Default)']; return localized; }
    }
    if (el?.closest?.('[data-testid="ssh-connect-error"],[data-testid="toast-notification"][data-notification-tag="ssh-connect-failed"]')
        && (original.includes('\n') || /^.+\s+reported:\s*/i.test(key) || /^[A-Z][A-Z0-9_]{2,}:\s+/.test(key))) {
      return translateSshErrorText(original, el);
    }
    if (!key || /(?:https?:\/\/|^(?:\/|~\/|[A-Za-z]:\\))/.test(key)) return original;
    if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(key)) {
      const templated = matchTemplate(key, el);
      if (templated !== undefined) return original.match(/^\s*/)[0] + templated + original.match(/\s*$/)[0];
      return original;
    }
    if (isBrandName(key)) return original;
    const route=el?scopeRoute(el):null;
    const scoped=el?scopeKey(key,kind||inferKind(el),route):null;
    const pluginScoped=el&&pluginDescription(el)?scopeKey(key,'description','/customizations'):null;
    let contextual=(scoped&&dictionary.entries[scoped])??(pluginScoped&&dictionary.entries[pluginScoped]);
    if(contextual===undefined&&scoped){
      const lowerScoped = scopeKey(lower(key),kind||inferKind(el),route);
      contextual=dictionary.entries[lowerScoped];
    }
    if(contextual===undefined&&el&&route){
      contextual=dictionary.entries[`@ui:${route}|label|${key}`]??dictionary.entries[`@ui:${route}|heading|${key}`]??dictionary.entries[`@ui:${route}|text|${key}`]??dictionary.entries[`@ui:${route}|option|${key}`]
        ??dictionary.entries[`@ui:${route}|label|${lower(key)}`]??dictionary.entries[`@ui:${route}|heading|${lower(key)}`]??dictionary.entries[`@ui:${route}|text|${lower(key)}`]??dictionary.entries[`@ui:${route}|option|${lower(key)}`];
    }
    if(typeof contextual==='string'){lastMatchedKeys=[key];return original.match(/^\s*/)[0]+contextual+original.match(/\s*$/)[0];}
    let value = undefined;
    if(conservative){value=entryFor(key);if(value!==undefined)lastMatchedKeys=[key];else value=matchTemplate(key, el);return value===undefined?original:original.match(/^\s*/)[0]+value+original.match(/\s*$/)[0];}

    // P1-2: 含数字的文案优先匹配模板，避免词典中的硬编码覆盖通用模板
    if (/\d/.test(key)) {
      value = matchTemplate(key, el);
    }
    if (value === undefined) { value = entryFor(key); if(value!==undefined)lastMatchedKeys=[key]; }
    if (value === undefined) value = matchTemplate(key, el);
    if (value === undefined) return original;
    const lead = original.match(/^\s*/)[0];
    const tail = original.match(/\s*$/)[0];
    return lead + value + tail;
  }
  function getValue(node, attr) { return attr ? node.getAttribute(attr) : node.nodeValue; }
  function setValue(node, attr, value) {
    /* Writing a value that is already there still produces a MutationObserver record for an
       observed attribute, which re-schedules this node indefinitely. */
    if (getValue(node, attr) === value) return;
    if (attr) node.setAttribute(attr, value); else node.nodeValue = value;
  }
  /* Single source of truth for "may this node/attribute currently hold a translation?". Having one
     predicate is what keeps translation and restoration in agreement: when they disagreed, a value
     flip-flopped between English and Chinese on every scan. */
  function translatable(node, attr, scan) {
    if (attr) return attributeAllowed(node, attr);
    return eligible(node.parentElement, scan);
  }
  function elementHasActiveTranslation(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (inlineGroups.has(el)) return true;
    for (const attr of TRANSLATABLE_ATTRS) {
      if (nodeSlots.get(el)?.has(attr)) return true;
    }
    for (let child = el.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === Node.TEXT_NODE && nodeSlots.get(child)?.has('')) return true;
    }
    return false;
  }
  function syncElementLocFlag(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    if (languageMode === 'zh' && elementHasActiveTranslation(el)) {
      el.dataset.gravityboxLoc = '1';
    } else {
      delete el.dataset.gravityboxLoc;
    }
  }
  function updateValue(node, attr = '', scan = 0) {
    let slots = nodeSlots.get(node);
    const old = slots?.get(attr);
    const current = getValue(node, attr);
    const el = attr ? node : node.parentElement;
    if (current === null) {
      if (slots) { slots.delete(attr); if (!slots.size) activeNodes.delete(node); }
      syncElementLocFlag(el);
      return;
    }
    if (!translatable(node, attr, scan)) {
      /* No longer allowed: put the original back (only if we are the ones who changed it), then
         drop the slot so a later re-entry starts from the real text instead of a stale value. */
      if (old && current === old.last) setValue(node, attr, old.original);
      if (slots) { slots.delete(attr); if (!slots.size) activeNodes.delete(node); }
      syncElementLocFlag(el);
      return;
    }
    if (old?.group) {
      if (current !== old.last && current !== old.original) {
        const group = old.group;
        invalidateInlineGroup(group);
        if (group && tryTranslateInlineGroup(group, scan)) return;
        if (node.parentElement && node.parentElement !== group && tryTranslateInlineGroup(node.parentElement, scan)) return;
      } else return;
    }
    if (!attr) {
      const outerComposite = node.parentElement?.parentElement;
      if (outerComposite && !inlineGroups.has(outerComposite) && compositePromptGroup(outerComposite, scan)) {
        if (tryTranslateInlineGroup(outerComposite, scan)) return;
      }
    }
    const retained = nodeSlots.get(node)?.get(attr);
    const original = retained && current === retained.last ? retained.original : current;
    lastMatchedKeys=[];
    const next = modelUiLabel(el) && normalize(original)==='New' ? (lastMatchedKeys=['New'],'新') : translation(original,el,attr==='placeholder'?'placeholder':inferKind(el));
    if (next !== original) {
      if (!slots) { slots = new Map(); nodeSlots.set(node, slots); }
      slots.set(attr, { original, last: next, matchedKeys:[...lastMatchedKeys], dictionaryVersion:dictionary.version });
      activeNodes.add(node);
    } else {
      if (slots) {
        slots.delete(attr);
        if (!slots.size) activeNodes.delete(node);
      }

    }
    const targetVal = languageMode === 'en' ? original : next;
    if (current !== targetVal) setValue(node, attr, targetVal);
    auditRecord(original,targetVal,el,attr ? 'attribute' : inferKind(el),nodeSlots.get(node)?.get(attr)?.matchedKeys??[]);

    syncElementLocFlag(el);
  }
  /* `input` / `textarea` are PROTECTED so their typed value is never touched, but their
     translated metadata (placeholder / title / aria-label / data-tooltip) is not user content:
     the app renders Chinese UI labels there, so those attributes are handled before the block. */
  /* Decides whether a translatable attribute (placeholder / title / aria-label / data-tooltip) may
     be translated. The attribute must sit in the same UI context a text node would need, but form
     fields are walked through instead of blocking: they are PROTECTED for their typed value, which
     is never touched, whereas a standalone <input placeholder="Search"> is a real UI string.
     An input that lives inside a conversation row or a code block still has no UI context, so it
     correctly stays English. */
  function attributeAllowed(element, attribute) {
    if(routeExcluded||restrictedAdaptiveRoute())return false;
    if (!TRANSLATABLE_ATTRS.includes(attribute)) return false;
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const original = nodeSlots.get(element)?.get(attribute)?.original ?? element.getAttribute(attribute) ?? '';
    const row = element.closest('[data-testid="conversation-row-sidebar"]');
    if (row && element.matches('button,[role="button"]') && ['More options','Pin conversation','Unpin conversation','Archive conversation','Unarchive conversation','Delete conversation'].includes(normalize(original))) {
      return ancestors(element).every(el=>!matches(el,PROTECTED)||el===row);
    }
    if (userNamed(element)) return false;
    if (attribute === 'aria-label' && element.matches('button[data-testid="model-selector-trigger"],[role="button"][data-testid="model-selector-trigger"]')
        && /^Select model,\s*current:\s*.+$/i.test(original)) {
      return ancestors(element).every(el => !isProtectedElement(el, scanCount) || el === element);
    }
    const protectedParents = ancestors(element).filter(el => isProtectedElement(el, scanCount));
    if (protectedParents.some(el => el !== element || !['INPUT', 'TEXTAREA'].includes(el.tagName))) return false;
    // These first-party controls have no UI ancestor. Keep the exception exact so arbitrary
    // form metadata outside known UI (including the unknown-area fixture) remains untouched.
    if (attribute==='placeholder' && element.matches('input') && normalize(original)==='Search customizations...') return true;
    if (attribute==='aria-label' && normalize(original)==='Customizations views') return true;
    return Boolean(element.closest(UI));
  }
  const INLINE_TAGS = new Set(['CODE', 'STRONG', 'EM', 'A', 'KBD', 'B', 'I', 'SPAN', 'MARK', 'SMALL', 'SVG']);
  function isInlineTag(el) { return Boolean(el && INLINE_TAGS.has((el.tagName || '').toUpperCase())); }
  function isIconElement(el) { return Boolean(el && (el.tagName || '').toUpperCase() === 'SVG'); }

  function isInlineGroupContainer(el, scan = 0) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (!eligible(el, scan) || blocked(el, scan)) return false;
    if (el.closest?.('[data-testid="ssh-connect-error"],[data-testid="toast-notification"][data-notification-tag="ssh-connect-failed"]')
        && ((el.textContent || '').includes('\n') || el.querySelector?.('.font-mono'))) {
      return false;
    }
    const children = el.childNodes;
    if (children.length < 2 || children.length > 20) return false;
    let hasText = false;
    let hasInline = false;
    let allText = true;
    let allInlineIcons = true;
    let hasTextBeforeInline = false;
    let hasTextAfterInline = false;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (c.nodeType === Node.TEXT_NODE) {
        if (normalize(c.nodeValue || '')) {
          hasText = true;
          if (!hasInline) hasTextBeforeInline = true;
          else hasTextAfterInline = true;
        }
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        allText = false;
        if (!isInlineTag(c)) return false;
        if (c.querySelector('div, p, ul, ol, li, table, form, section, article')) return false;
        if (!isIconElement(c)) allInlineIcons = false;
        hasInline = true;
      } else {
        return false;
      }
    }
    if (hasInline && allInlineIcons && !(hasTextBeforeInline && hasTextAfterInline)) return false;
    return (hasText && hasInline) || (allText && children.length >= 2 && hasText);
  }

  function invalidateInlineGroup(el) {
    const nodes = inlineGroups.get(el);
    const inlineEls = inlineGroupInlineElements.get(el);
    inlineGroupContainers.delete(el);
    inlineGroupInlineElements.delete(el);
    clearInlineGroupUnsupported(el);
    if (nodes) {
      inlineGroups.delete(el);
      for (const node of nodes) {
        const slots = nodeSlots.get(node);
        const slot = slots?.get('');
        if (slot?.group !== el) continue;
        if (getValue(node, '') === slot.last) setValue(node, '', slot.original);
        slots.delete('');
        if (!slots.size) activeNodes.delete(node);
      }
    }
    if (inlineEls) {
      for (const inlineEl of inlineEls) {
        const walker = document.createTreeWalker(inlineEl, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const tNode = walker.currentNode;
          const tSlots = nodeSlots.get(tNode);
          const tSlot = tSlots?.get('');
          if (!tSlot || tSlot.group) continue;
          if (getValue(tNode, '') === tSlot.last) setValue(tNode, '', tSlot.original);
          tSlots.delete('');
          if (!tSlots.size) activeNodes.delete(tNode);
        }
        syncElementLocFlag(inlineEl);
      }
    }
    if (nodes || inlineEls) syncElementLocFlag(el);
  }

  /* J04 (conservative): the template is the element's direct children rendered as text runs plus
     {N} placeholders. Only a translation that can be laid out losslessly in place is applied:
     same placeholder multiset, identical placeholder order, and an existing text run for every
     non-empty translated segment. Reordered/missing/extra placeholders or a needed run without a
     DOM slot keep the COMPLETE English sentence (no partial translation, no plain-text fallback,
     links/buttons are never cleared and React-owned inline nodes are never moved); those groups are
     marked unsupported for review and are still collected as one whole-sentence key. */
  function groupTemplate(el) {
    const children = el.childNodes;
    let rawTemplate = '';
    const inlineElements = [];
    const slotsMap = new Map();
    let currentSlot = 0;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (c.nodeType === Node.TEXT_NODE) {
        const slot = nodeSlots.get(c)?.get('');
        const origText = (slot && slot.original !== undefined) ? slot.original : (c.nodeValue || '');
        rawTemplate += origText;
        if (!slotsMap.has(currentSlot)) slotsMap.set(currentSlot, []);
        slotsMap.get(currentSlot).push({ node: c, original: origText });
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        const idx = inlineElements.length;
        inlineElements.push(c);
        rawTemplate += `{${idx}}`;
        currentSlot = idx + 1;
      }
    }
    return { rawTemplate, inlineElements, slotsMap };
  }
  function groupDisplayedTemplate(el) {
    let raw = '';
    let index = 0;
    for (const c of el.childNodes) {
      if (c.nodeType === Node.TEXT_NODE) raw += c.nodeValue || '';
      else if (c.nodeType === Node.ELEMENT_NODE) { raw += `{${index}}`; index++; }
    }
    return raw;
  }
  function placeholderTokens(text) { return text.match(/\{\d+\}/g) ?? []; }
  function samePlaceholderSet(left, right) {
    if (left.length !== right.length) return false;
    const a = left.map(token => token.replace(/\D/g, '')).sort().join(',');
    const b = right.map(token => token.replace(/\D/g, '')).sort().join(',');
    return a === b;
  }
  function writeGroupSlot(node, el, zhVal, original, groupKeys) {
    let slots = nodeSlots.get(node);
    if (!slots) { slots = new Map(); nodeSlots.set(node, slots); }
    const prevOriginal = slots.get('')?.original;
    const finalOriginal = prevOriginal !== undefined ? prevOriginal : original;
    slots.set('', { original: finalOriginal, last: zhVal, group: el, groupParent: node.parentElement, matchedKeys: groupKeys, dictionaryVersion: dictionary.version });
    activeNodes.add(node);
    const targetVal = languageMode === 'en' ? finalOriginal : zhVal;
    if (node.nodeValue !== targetVal) setValue(node, '', targetVal);
  }
  function applyGroupSegments(el, segments, slotsMap, inlineElements, groupKeys, norm, zh, queue = waiting, trackInlineElements = false) {
    clearInlineGroupUnsupported(el);
    inlineGroups.set(el, [...slotsMap.values()].flat().map(item => item.node));
    if (trackInlineElements) inlineGroupInlineElements.set(el, [...inlineElements]);
    else inlineGroupInlineElements.delete(el);
    inlineGroupContainers.add(el);
    for (let s = 0; s <= inlineElements.length; s++) {
      const items = slotsMap.get(s) || [];
      const part = segments[s] !== undefined ? segments[s] : '';
      for (let k = 0; k < items.length; k++) writeGroupSlot(items[k].node, el, k === 0 ? part : '', items[k].original, groupKeys);
    }
    auditRecord(norm, zh, el, 'template', groupKeys);
    syncElementLocFlag(el);
    for (let i = inlineElements.length - 1; i >= 0; i--) queue.add(inlineElements[i]);
    return true;
  }
  function inlineGroupFor(node, scan) {
    const parent = node.parentElement;
    if (!parent) return null;
    if (isInlineTag(parent) || parent.tagName === 'BUTTON') {
      const outer = parent.parentElement;
      if (outer && (isInlineGroupContainer(outer, scan) || compositePromptGroup(outer, scan))) return outer;
    }
    return (isInlineGroupContainer(parent, scan) || compositePromptGroup(parent, scan)) ? parent : null;
  }
  function compositePromptGroup(el, scan = 0) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
    if (!eligible(el, scan) || blocked(el, scan)) return null;
    const children = el.childNodes;
    if (children.length < 2 || children.length > 10) return null;
    let rawTemplate = '';
    let displayedTemplate = '';
    const inlineElements = [];
    const slotsMap = new Map();
    let currentSlot = 0;
    let seenSemantic = false;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (c.nodeType === Node.TEXT_NODE) {
        if (normalize(c.nodeValue || '')) return null;
        continue;
      }
      if (c.nodeType !== Node.ELEMENT_NODE) return null;
      if (!seenSemantic && isIconElement(c)) continue;
      if (c.tagName === 'SPAN' && c.childElementCount === 0 && c.childNodes.length === 1 && c.firstChild.nodeType === Node.TEXT_NODE) {
        seenSemantic = true;
        const textNode = c.firstChild;
        const curText = textNode.nodeValue || '';
        const origText = nodeSlots.get(textNode)?.get('')?.original ?? curText;
        if (!normalize(origText)) return null;
        if (rawTemplate && !/\s$/.test(rawTemplate) && !/^\s/.test(origText)) rawTemplate += ' ';
        rawTemplate += origText;
        if (displayedTemplate && !/\s$/.test(displayedTemplate) && curText && !/^\s/.test(curText)) displayedTemplate += ' ';
        displayedTemplate += curText;
        if (!slotsMap.has(currentSlot)) slotsMap.set(currentSlot, []);
        slotsMap.get(currentSlot).push({ node: textNode, original: origText });
        continue;
      }
      if ((c.tagName === 'BUTTON' || c.tagName === 'A') && c.childElementCount === 0 && !blocked(c, scan)) {
        seenSemantic = true;
        const idx = inlineElements.length;
        if (idx > 0) return null;
        inlineElements.push(c);
        if (rawTemplate && !/\s$/.test(rawTemplate)) rawTemplate += ' ';
        rawTemplate += `{${idx}}`;
        if (displayedTemplate && !/\s$/.test(displayedTemplate)) displayedTemplate += ' ';
        displayedTemplate += `{${idx}}`;
        currentSlot = idx + 1;
        continue;
      }
      return null;
    }
    if (!inlineElements.length || !(slotsMap.get(0)?.length) || !(slotsMap.get(1)?.length)) return null;
    return { rawTemplate, displayedTemplate, inlineElements, slotsMap };
  }
  function validateInlineSegments(norm, zh, slotsMap) {
    const normPlaceholders = placeholderTokens(norm), zhPlaceholders = placeholderTokens(zh);
    if (!samePlaceholderSet(zhPlaceholders, normPlaceholders)) return null;
    if (zhPlaceholders.join() !== normPlaceholders.join()) return null;
    const segments = zh.split(/\{\d+\}/);
    if (segments.some((part, index) => part && (slotsMap.get(index)?.length ?? 0) === 0)) return null;
    return segments;
  }
  function markInlineGroupUnsupported(el, reason) {
    unsupportedInlineGroupReasons.set(el, reason || INLINE_LAYOUT_WARNING);
    unsupportedInlineGroupSet.add(el);
    return true; /* handled: keep the complete English sentence, do not translate descendants */
  }
  function clearInlineGroupUnsupported(el) {
    unsupportedInlineGroupReasons.delete(el);
    unsupportedInlineGroupSet.delete(el);
  }
  function invalidateRecordedGroupIfStale(el) {
    const recorded = inlineGroups.get(el);
    if (recorded?.some(node => {
      const slot = nodeSlots.get(node)?.get('');
      return !slot || slot.group !== el || slot.groupParent !== node.parentElement || (getValue(node, '') !== slot.last && getValue(node, '') !== slot.original);
    })) invalidateInlineGroup(el);
  }
  function mapZhTerminalPunct(ch) {
    if (ch === '.') return '。';
    if (ch === '?') return '？';
    if (ch === '!') return '！';
    return '';
  }
  function translateInlineGroupText(norm, el) {
    const direct = translation(norm, el);
    if (direct !== norm && /[\u3400-\u9fff]/.test(direct)) {
      return { zh: direct, keys: [...lastMatchedKeys] };
    }
    // Trailing standalone placeholder(s) after a complete sentence (e.g. "Main sentence. {0}.")
    const trailingMatch = norm.match(/^([\s\S]+?[.?!])(\s*)((?:\{\d+\})+)([.?!])?$/);
    if (trailingMatch) {
      const [, prefix, sep, tailPh, tailPunct] = trailingMatch;
      const prefixZh = translation(prefix, el);
      const prefixKeys = [...lastMatchedKeys];
      if (
        prefixZh !== prefix &&
        /[\u3400-\u9fff]/.test(prefixZh) &&
        placeholderTokens(prefixZh).join(',') === placeholderTokens(prefix).join(',')
      ) {
        const mappedPunct = tailPunct ? mapZhTerminalPunct(tailPunct) : '';
        return { zh: `${prefixZh}${sep ? ' ' : ''}${tailPh}${mappedPunct}`, keys: prefixKeys };
      }
    }
    // Atomic sentence-level split: only accept if every sentence translates cleanly with preserved placeholders.
    const sentences = norm.split(/(?<=[.?!])\s+/);
    if (sentences.length < 2) return null;
    const translatedParts = [];
    const collectedKeys = [];
    let hasTranslatedProse = false;
    for (const rawSentence of sentences) {
      const sentence = normalize(rawSentence);
      if (!sentence) continue;
      const purePh = sentence.match(/^((?:\{\d+\})+)([.?!])?$/);
      if (purePh) {
        translatedParts.push(`${purePh[1]}${purePh[2] ? mapZhTerminalPunct(purePh[2]) : ''}`);
        continue;
      }
      const partZh = translation(sentence, el);
      const partKeys = [...lastMatchedKeys];
      if (
        partZh === sentence ||
        !/[\u3400-\u9fff]/.test(partZh) ||
        placeholderTokens(partZh).join(',') !== placeholderTokens(sentence).join(',')
      ) {
        return null;
      }
      hasTranslatedProse = true;
      translatedParts.push(partZh);
      for (const k of partKeys) if (!collectedKeys.includes(k)) collectedKeys.push(k);
    }
    if (!hasTranslatedProse || !translatedParts.length) return null;
    let combined = translatedParts[0];
    for (let i = 1; i < translatedParts.length; i++) {
      const prev = combined;
      const next = translatedParts[i];
      const needSpace = /\{\d+\}$/.test(prev) || /^\{\d+\}/.test(next);
      combined += (needSpace ? ' ' : '') + next;
    }
    return { zh: combined, keys: collectedKeys };
  }
  function tryTranslateInlineGroup(el, scan = 0, queue = waiting) {
    if (conservative && !inSystemSettings(el, scan) && !el.closest('[data-testid*="empty"],[data-testid*="sidecar"],[data-testid*="modal"],[data-testid*="card"],[role="region"]')) return false;
    const standard = isInlineGroupContainer(el, scan);
    if (!standard) {
      const composite = compositePromptGroup(el, scan);
      if (!composite) {
        if (inlineGroups.has(el)) invalidateInlineGroup(el);
        clearInlineGroupUnsupported(el);
        return false;
      }
      invalidateRecordedGroupIfStale(el);
      const norm = normalize(composite.rawTemplate);
      if (!norm) return false;
      const resolved = translateInlineGroupText(norm, el);
      if (!resolved) {
        if (inlineGroups.has(el)) invalidateInlineGroup(el);
        clearInlineGroupUnsupported(el);
        return true;
      }
      const { zh, keys: groupKeys } = resolved;
      const segments = validateInlineSegments(norm, zh, composite.slotsMap);
      if (!segments) {
        if (inlineGroups.has(el)) invalidateInlineGroup(el);
        return markInlineGroupUnsupported(el);
      }
      return applyGroupSegments(el, segments, composite.slotsMap, composite.inlineElements, groupKeys, norm, zh, queue, true);
    }
    invalidateRecordedGroupIfStale(el);
    const { rawTemplate, inlineElements, slotsMap } = groupTemplate(el);
    const norm = normalize(rawTemplate);
    if (!norm) return false;
    const resolved = translateInlineGroupText(norm, el);
    if (!resolved) { clearInlineGroupUnsupported(el); return false; }
    const { zh, keys: groupKeys } = resolved;
    if (!inlineElements.length) {
      const items = slotsMap.get(0) || [];
      if (items.length <= 1) return false;
      clearInlineGroupUnsupported(el);
      inlineGroups.set(el, items.map(item => item.node));
      inlineGroupContainers.add(el);
      for (let k = 0; k < items.length; k++) writeGroupSlot(items[k].node, el, k === 0 ? zh : '', items[k].original, groupKeys);
      auditRecord(norm, zh, el, 'template', groupKeys);
      syncElementLocFlag(el);
      return true;
    }
    /* Conservative J04 correction: never rearrange React-owned inline nodes and never move inline
       text into a plain-text run. Only a same-order translation whose non-empty runs all own an
       existing text slot is applied in place; everything else keeps the complete English sentence
       (no fragment half-translation, links/buttons untouched) and is marked unsupported/review. */
    const segments = validateInlineSegments(norm, zh, slotsMap);
    if (!segments) return markInlineGroupUnsupported(el);
    return applyGroupSegments(el, segments, slotsMap, inlineElements, groupKeys, norm, zh, queue);
  }

  function refreshInlineGroup(el, scan) {
    const translated = el.isConnected && tryTranslateInlineGroup(el, scan);
    const reason = unsupportedInlineGroupReasons.get(el);
    // Keep a valid old translation until the new runs can be committed in this same task.
    // Removed/unsafe translations still restore complete English and retain their review marker.
    if (!translated || reason) {
      invalidateInlineGroup(el);
      if (reason) markInlineGroupUnsupported(el, reason);
    }
  }

  function pushTree(node, scan = 0, queue = waiting) {
    if (!node?.isConnected) return;
    if (node.nodeType === Node.TEXT_NODE) { updateValue(node, '', scan); return; }
    if (![Node.ELEMENT_NODE, Node.DOCUMENT_NODE, Node.DOCUMENT_FRAGMENT_NODE].includes(node.nodeType)) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (queue === settingsWaiting && node.style?.display === 'none') {
        waiting.add(node);
        return;
      }
      protectionTokens.set(node, protectionToken(node));
      for (const attr of TRANSLATABLE_ATTRS)
        if (node.hasAttribute(attr)) updateValue(node, attr, scan);
      const isConvoRow = matches(node, '[data-testid="conversation-row-sidebar"],[data-testid*="conversation-row"],a[href^="/c/"],a[href*="/c/"]');
      if (blocked(node, scan)) {
        if (isConvoRow) for (const badge of node.querySelectorAll('span,time')) if (isRelativeTimeBadge(badge)) queue.add(badge);
        if (isConvoRow) for (const control of node.querySelectorAll('button,[role="button"]')) queue.add(control);
        if (node.closest('[data-testid*="model"]')) for (const label of node.querySelectorAll('span,p,h1,h2,h3,h4,div')) if (modelUiLabel(label)) queue.add(label);
        return;
      }
      if (node.shadowRoot) { observe(node.shadowRoot); queue.add(node.shadowRoot); }
      if (tryTranslateInlineGroup(node, scan, queue)) return;
    }
    for (let i = node.childNodes.length - 1; i >= 0; i--) queue.add(node.childNodes[i]);
  }
  /* When a node stops being translatable (moved into protected content, or a protection-state
     fingerprint changed) the slot may be stale. The sweep is budgeted and incremental: a slice
     spends at most RECONCILE_BUDGET_MS, the remaining nodes stay queued for the next flush, and a
     fresh scan token per slice keeps the per-scan blocked/eligible caches useful. */
  const RECONCILE_BUDGET_MS = 4;
  let reconcileQueue = null;
  let reconcileChecks = 0;
  let reconcilePasses = 0;
  let lastPruneAt = 0;
  function reconcileRecords() {
    if (!reconcileQueue) { reconcilePasses++; reconcileQueue = { nodes: [...activeNodes], index: 0 }; }
    const queue = reconcileQueue;
    const scan = ++scanCount;
    if (queue.index === 0 && inlineGroupContainers.size) {
      refreshProjectNames(scan);
      for (const groupEl of [...inlineGroupContainers]) {
        if (!groupEl.isConnected) { inlineGroupContainers.delete(groupEl); continue; }
        if (!eligible(groupEl, scan)) invalidateInlineGroup(groupEl);
      }
    }
    const started = performance.now();
    while (queue.index < queue.nodes.length && performance.now() - started < RECONCILE_BUDGET_MS) {
      const node = queue.nodes[queue.index++];
      reconcileChecks++;
      if (!node.isConnected) { activeNodes.delete(node); continue; }
      const slots = nodeSlots.get(node);
      if (!slots?.size) { activeNodes.delete(node); continue; }
      for (const attr of [...slots.keys()]) if (!translatable(node, attr, scan)) updateValue(node, attr, scan);
    }
    if (queue.index >= queue.nodes.length) reconcileQueue = null;
    else if (timer === null) timer = setTimeout(flush, 0);
  }
  function pruneActiveNodes() {
    lastPruneAt = performance.now();
    if (settingsPaneCache && !settingsPaneCache.root.isConnected) { settingsPaneCache = null; settingsScope = null; settingsScopeScan = -1; }
    if (!/^\/customizations(?:\/installed)?$/.test(location.pathname)) { pluginCards = []; pluginCardsAt = -1; }
    for (const ref of ownedProjectMarkers) if (!ref.deref()) ownedProjectMarkers.delete(ref);
    for (const node of activeNodes) if (!node.isConnected) activeNodes.delete(node);
    for (const el of inlineGroupContainers) if (!el.isConnected) inlineGroupContainers.delete(el);
    for (const el of unsupportedInlineGroupSet) if (!el.isConnected) { unsupportedInlineGroupSet.delete(el); unsupportedInlineGroupReasons.delete(el); }
  }
  function cleanup() {
    let reset = false;
    for (const root of observed) if (root !== document && !root.host?.isConnected) { observed.delete(root); reset = true; }
    if (reset) { observer.disconnect(); for (const root of observed) observer.observe(root, observerOptions); }
  }
  function schedule(node) {
    if (!active) return;
    pending.add(node);
    if (timer === null && !scanning) timer = setTimeout(flush, 0);
  }
  function flush() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (!active) return;
    checkRoute();
    if (routeExcluded) { pending.clear(); waiting.clear(); settingsWaiting.clear(); requeueDocument = false; scanning = false; return; }
    scanning = true;
    const flushStarted = performance.now();
    const scan = ++scanCount;
    refreshProjectNames(scan);
    const settingsPane = systemSettingsPane();
    const settingsRoot = settingsPane ? settingsPaneCache?.root : null;
    for (const node of pending) {
      if (settingsPane?.contains(node) || (settingsRoot?.contains(node) && node !== settingsRoot)) settingsWaiting.add(node);
      else {
        waiting.add(node);
        if (settingsPane && node.contains?.(settingsPane)) {
          for (const element of settingsPaneCache.chrome) settingsWaiting.add(element);
          settingsWaiting.add(settingsPane);
        }
      }
    }
    pending.clear();
    let work = 0;
    /* Drain by insertion order with an explicit cursor: re-adding a node during the sweep used
       to be revisited in the same slice, which is how a single mutation could be re-expanded
       many times over. Nodes appended by this sweep are picked up by the next one. */
    // The validated settings content pane runs before background/sidebar work within the same
    // 8ms budget; hidden inactive settings tabs are deferred to `waiting` so visible settings paint in Chinese on frame 1.
    while ((settingsWaiting.size || waiting.size) && work < 5000 && performance.now() - flushStarted < 8) {
      const queue = settingsWaiting.size ? settingsWaiting : waiting;
      const node = queue.values().next().value;
      queue.delete(node);
      pushTree(node, scan, queue);
      work++;
    }
    scanning = false;
    if (waiting.size + settingsWaiting.size > QUEUE_LIMIT) {
      waiting.clear(); settingsWaiting.clear();
      requeueDocument = true;
      queueTrimmed = true;
      droppedBatches++;
    }
    if (waiting.size || settingsWaiting.size || pending.size || requeueDocument) {
      if (requeueDocument && !waiting.size && !settingsWaiting.size && !pending.size) { requeueDocument = false; schedule(document); }
      if (timer === null) timer = setTimeout(flush, 0);
    } else {
      requeueDocument = false;
      /* A reconcile pass writes nothing when every recorded node is already in its correct
         state, so it cannot re-arm itself; when it does write, the resulting mutations bring us
         back here once more and the second pass is a no-op. */
      if (reconcileQueue || reconcileRequested) { reconcileRequested = false; reconcileRecords(); }
      else {
        cleanup();
        if (performance.now() - lastPruneAt > 2000) pruneActiveNodes();
      }
      if(dictionaryToastPending){
        dictionaryToastPending=false;
        if(languageMode==='zh'&&document.visibilityState==='visible'&&performance.now()-dictionaryToastLastAt>2500){dictionaryToastLastAt=performance.now();showToast('GravityBox · 词典已同步更新',1000);}
      }
    }
    maxSliceMs = Math.max(maxSliceMs, performance.now() - flushStarted);
  }
  const observerOptions = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: OBSERVER_ATTR_FILTER };
  function observe(root) { if (!observed.has(root)) { observed.add(root); observer.observe(root, observerOptions); } }
  /* Any mutation of class / role / contenteditable / protection / message / link attributes can switch
     a node between "translatable" and "protected", so a reconcile pass is requested; the reconcile
     walks only the recorded nodes instead of re-scanning the changed node's whole subtree. */
  observer = new MutationObserver(mutations => {
    if (!scanning) checkRoute();
    let hasAdded = false;
    for (const mutation of mutations) {
      const targetEl = mutation.target.nodeType === Node.ELEMENT_NODE ? mutation.target : mutation.target.parentElement;
      const inStaticProtected = Boolean(
        targetEl?.closest?.('[data-gravitybox-protect],.monaco-editor,.xterm,[data-message-id],[data-message-author-role],[data-testid="planner-response-text"],.markdown,.prose,pre,code') &&
        !targetEl.closest?.('[data-testid="conversation-row-sidebar"],[data-testid*="model"]')
      );
      if (mutation.type === 'childList') {
        if (inStaticProtected) {
          if (mutation.removedNodes.length && [...mutation.removedNodes].some(n => activeNodes.has(n))) reconcileRequested = true;
          if (mutation.addedNodes.length && activeNodes.size > 0 && [...mutation.addedNodes].some(n => activeNodes.has(n) || (n.nodeType === Node.ELEMENT_NODE && (n.hasAttribute('data-gravitybox-loc') || n.querySelector?.('[data-gravitybox-loc="1"]'))))) reconcileRequested = true;
          continue;
        }
        for (const node of mutation.addedNodes) {
          pending.add(node);
          hasAdded = true;
        }
        if (mutation.removedNodes.length) reconcileRequested = true;
        if (inlineGroups.has(mutation.target)) refreshInlineGroup(mutation.target, ++scanCount);
        if (!projectSearchDirty && mutation.target.nodeType === Node.ELEMENT_NODE && (matches(mutation.target, '[data-testid="project-header"],[data-testid*="project-selector"]') || mutation.target.closest('[data-testid="project-header"],[data-testid*="project-selector"]'))) projectSearchDirty = true;
      } else if (mutation.type === 'characterData') {
        if (inStaticProtected && !nodeSlots.has(mutation.target)) continue;
        /* Ignore the engine's own text mutations to avoid self-feedback churn. */
        const slot = nodeSlots.get(mutation.target)?.get('');
        if (slot && getValue(mutation.target, '') === slot.last) continue;
        /* Text updates only need this node re-evaluated; reconcile is reserved for protection
           changes, so streamed tokens no longer trigger a recorded-node sweep. */
        pending.add(mutation.target);
      } else {
        /* Ignore the engine's own attribute mutations. */
        const attr = mutation.attributeName || '';
        const slot = nodeSlots.get(mutation.target)?.get(attr);
        if (slot && getValue(mutation.target, attr) === slot.last) continue;
        if (attr === 'href' && mutation.target.tagName !== 'A') continue;
        if (PROTECTION_ATTR_SET.has(attr)) {
          if (!protectionChanged(mutation.target)) continue;
          reconcileRequested = true;
        }
        pending.add(mutation.target);
      }
    }
    // Mounts and React text updates in settings are handled before paint. The normal page queue
    // retains its existing incremental scheduling and every queue still obeys flush's budget.
    const maybeSettings = settingsPaneCache !== null || (hasAdded && [...pending].some(node => {
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      return el?.closest?.('[role="dialog"],[data-testid="settings-root"],[data-testid="settings-dialog"]') || el?.querySelector?.('[role="dialog"],[data-testid="settings-root"],[data-testid="settings-dialog"]');
    }));
    const settingsPane = maybeSettings ? systemSettingsPane() : null;
    const settingsRoot = settingsPane ? settingsPaneCache?.root : null;
    const settingsChanged = (settingsRoot || settingsPane) && [...pending].some(node => (settingsRoot || settingsPane).contains(node));
    if ((hasAdded || settingsChanged || (pending.size > 0 && pending.size <= 32 && !reconcileRequested)) && !scanning) {
      flush();
    } else if ((pending.size || reconcileRequested) && timer === null && !scanning) {
      timer = setTimeout(flush, 0);
    }
  });
  let updateGeneration = 0;
  let updateTimer = null;
  const api = {
    refresh() {
      if (!active) return api.state();
      checkRoute();
      const pane = systemSettingsPane();
      if (pane) {
        pending.add(settingsPaneCache?.root || pane);
        if (!scanning) flush();
      } else {
        schedule(document);
      }
      return api.state();
    },
    update(next) {
      if (!active || !next || next.schema !== 1 || typeof next.version !== 'string' || !next.entries) throw new Error('Invalid dictionary');
      checkRoute();
      const changed = next.version !== dictionary.version || JSON.stringify(next.templateRules ?? null) !== JSON.stringify(dictionary?.templateRules ?? null);
      if (!changed) return api.refresh();
      rebuildIndex(next);
      dictionaryToastPending = true;
      const generation = ++updateGeneration;
      if (updateTimer !== null) { clearTimeout(updateTimer); updateTimer = null; }
      const groups = [...inlineGroupContainers], nodes = [...activeNodes];
      let groupIndex = 0, nodeIndex = 0;
      const updateSlice = () => {
        if (!active || generation !== updateGeneration) return;
        updateTimer = null;
        const started = performance.now();
        const scan = ++scanCount;
        while (groupIndex < groups.length && performance.now()-started < 4) refreshInlineGroup(groups[groupIndex++], scan);
        while (nodeIndex < nodes.length && performance.now()-started < 4) {
          const node = nodes[nodeIndex++];
          if (!node.isConnected) { activeNodes.delete(node); continue; }
          const slots = nodeSlots.get(node); if (!slots) { activeNodes.delete(node); continue; }
          for (const attr of [...slots.keys()]) updateValue(node,attr,scan);
        }
        maxSliceMs = Math.max(maxSliceMs,performance.now()-started);
        if (generation !== updateGeneration) return;
        if(groupIndex<groups.length||nodeIndex<nodes.length) updateTimer = setTimeout(updateSlice,0);
        else {requeueDocument=true;schedule(document);}
      };
      updateSlice();
      requeueDocument = true;
      schedule(document);
      return api.state();
    },
    toggleLanguage(mode) {
      const next = mode || (languageMode === 'zh' ? 'en' : 'zh');
      languageMode = next;
      const scan = ++scanCount;
      refreshProjectNames(scan);
      for (const groupEl of [...inlineGroupContainers]) {
        if (!groupEl.isConnected) { inlineGroupContainers.delete(groupEl); continue; }
        if (!eligible(groupEl, scan)) invalidateInlineGroup(groupEl);
      }
      for (const node of [...activeNodes]) {
        if (!node.isConnected) { activeNodes.delete(node); continue; }
        const slots = nodeSlots.get(node);
        if (!slots) { activeNodes.delete(node); continue; }
        for (const [attr, slot] of [...slots]) {
          const current = getValue(node, attr);
          if (!translatable(node, attr, scan)) {
            if (current === slot.last) setValue(node, attr, slot.original);
            slots.delete(attr);
            if (!slots.size) activeNodes.delete(node);
            syncElementLocFlag(attr ? node : node.parentElement);
            if (slot.group) syncElementLocFlag(slot.group);
            continue;
          }
          if (languageMode === 'en') {
            if (current === slot.last) setValue(node, attr, slot.original);
          } else {
            if (current === slot.original) setValue(node, attr, slot.last);
          }
          syncElementLocFlag(attr ? node : node.parentElement);
          if (slot.group) syncElementLocFlag(slot.group);
        }
      }
      try{globalThis.__gravityboxLanguageChanged?.(languageMode);}catch{}
      try{globalThis.__GRAVITYBOX_HUD_V1__?.setLanguage?.(languageMode);}catch{}
      return { mode: languageMode, activeNodes: activeNodes.size, groups: inlineGroupContainers.size };
    },
    getLanguageMode() { return languageMode; },
    setShortcutEnabled(enabled){shortcutEnabled=options.path==='/fixture'&&enabled===true;return{enabled:shortcutEnabled};},
    draftState(){
      const rendered=e=>!!e?.getClientRects().length&&getComputedStyle(e).visibility!=="hidden";
      const draft=[...document.querySelectorAll('input,textarea,[contenteditable]:not([contenteditable="false"])')].some(e=>rendered(e)&&!e.readOnly&&!e.disabled&&!['button','submit','reset','checkbox','radio','range','hidden','file'].includes(e.type)&&(e.value??e.textContent??'').trim());
      const attachments=[...document.querySelectorAll('input[type="file"]')].some(e=>e.files?.length>0)||[...document.querySelectorAll('[data-testid*="attachment"],[data-testid*="file-chip"]')].some(rendered);
      const unsaved=[...document.querySelectorAll('.tab.dirty,[data-dirty="true"],[role="tab"][aria-label*="unsaved" i]')].some(rendered);
      const generating=[...document.querySelectorAll('button,[role="button"]')].some(e=>{
        if(!rendered(e))return false;
        if(e.getAttribute('data-testid')==='input-cancel-button')return true;
        const label=(e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent||'').trim();
        if(/^(?:Stop generating|Cancel generation|Cancel\s*[（(][^）)]+[）)]|停止生成|取消生成|终止生成|取消\s*[（(][^）)]+[）)])$/i.test(label))return true;
        if(/^(?:Stop|停止)$/i.test(label)&&Boolean(e.closest('[data-testid="agent-input-box"],.surface-composer')))return true;
        return false;
      });
      return {busy:draft||attachments||unsaved||generating,draft,attachments,unsaved,generating};
    },
    maintenanceState(){const state=api.draftState();return{...state,busy:state.busy||[...document.querySelectorAll('[role="dialog"],[role="menu"]')].some(visibleUi)};},
    collectUntranslated(options = {}) {
      if(languageMode==='en'||routeExcluded||restrictedAdaptiveRoute())return [];
      const budgetMs = options?.fullScan ? Infinity : 12;
      const collectStarted=performance.now();lastCollectionTruncated=false;
      const rows=new Map(),scan=++scanCount;refreshProjectNames(scan);
      const add=(raw,el,kind,attribute,template=false,layoutWarning)=>{
        if(template&&conservative&&!inSystemSettings(el,scan))return;
        if(conservative&&!attribute&&!template&&!isDialogPromptParagraph(el)&&!el?.closest('button,[role="button"],[role="tab"],[role="menuitem"],[role="tooltip"],label,h1,h2,h3,h4,[data-select-popup],[role="menu"],[role="listbox"],[role="option"]')&&!inSystemSettings(el,scan))return;
        const valid=template?isValidTemplateText(raw):isValidUiText(raw);
        if(rows.size>=500||!visibleUi(el)||userNamed(el)||(attribute ? !attributeAllowed(el,attribute) : blocked(el,scan)||(!template&&!el.closest(UI_SELECTOR)&&!inSystemSettings(el,scan)&&!isDialogPromptParagraph(el)))||pluginDescription(el)||!valid)return;
        const key=normalize(raw),route=scopeRoute(el);
        if(isBrandName(key))return;
        /* An unsupported inline layout is still a candidate even when the dictionary holds an
           unusable translation: the user needs it listed to supply an in-order one. */
        if(!layoutWarning&&(entryFor(key)!==undefined||dictionary.entries[scopeKey(key,kind,route)]!==undefined))return;
        const warning=formatWarningFor(raw);
        rows.set(scopeKey(key,kind,route),{key,kind,route,source:'runtime-ui',
          ...(warning?{formatWarning:warning}:{}),
          ...(layoutWarning?{layoutWarning}:{})});
      };
      collectRoots: for(const root of observed){
        if(performance.now()-collectStarted>budgetMs){lastCollectionTruncated=true;break;}
        if(root!==document&&!root.host?.isConnected)continue;
        const walker=document.createTreeWalker(root===document?(document.body||document.documentElement):root,NodeFilter.SHOW_TEXT);
        let visited=0;const handledGroups=new Set();
        while(walker.nextNode()&&rows.size<500&&++visited<15000){
          if(performance.now()-collectStarted>budgetMs){lastCollectionTruncated=true;break collectRoots;}
          const n=walker.currentNode;
          /* J04: report one whole-sentence key for an inline group instead of its fragments. */
          const group=inlineGroupFor(n,scan);
          if(group){
            if(!handledGroups.has(group)){
              handledGroups.add(group);
              const comp=!isInlineGroupContainer(group,scan)?compositePromptGroup(group,scan):null;
              const displayed=comp?comp.displayedTemplate:groupDisplayedTemplate(group);
              const rawTpl=comp?comp.rawTemplate:groupTemplate(group).rawTemplate;
              const hasChinese=/[\u3400-\u9fff]/.test(displayed), hasEnglish=/[a-zA-Z]{2,}/.test(displayed);
              /* Fully translated groups are not candidates. A mixed group (some fragments already
                 translated individually by the dictionary) is offered as its whole English template
                 so one re-translation can replace the fragment mix. */
              const layoutWarning=unsupportedInlineGroupReasons.get(group);
              if(hasChinese&&hasEnglish)add(rawTpl,group,inferKind(group),undefined,true,layoutWarning);
              else if(!hasChinese)add(displayed,group,inferKind(group),undefined,true,layoutWarning);
            }
            continue;
          }
          add(n.textContent,n.parentElement,inferKind(n.parentElement));
        }
        for(const el of root.querySelectorAll('[title],[aria-label],[placeholder],[data-tooltip]')){
          if(performance.now()-collectStarted>budgetMs){lastCollectionTruncated=true;break collectRoots;}
          for(const attr of TRANSLATABLE_ATTRS)if(el.hasAttribute(attr)&&attributeAllowed(el,attr))add(el.getAttribute(attr),el,attr==='placeholder'?'placeholder':inferKind(el),attr);
        }
      }maxSliceMs=Math.max(maxSliceMs,performance.now()-collectStarted);return [...rows.values()];
    },
    pluginCatalog(){return pluginCatalog();},
    ruleCatalog(){return [...new Set([...customTemplateRules.map(r=>r.key),...TEMPLATE_RULES.map(r=>r.key)])];},
    capabilities(){return TEMPLATE_CAPABILITIES;},
    startAudit(knownKeys = []) {
      auditKeys = new Map([...knownKeys,...customTemplateRules.map(r=>r.key),...TEMPLATE_RULES.map(r=>r.key)].filter(k => typeof k === 'string').map(k => [normalize(k),k]));
      auditExpires = Date.now() + 15 * 60 * 1000; auditTrail.clear();
      return { expiresAt: new Date(auditExpires).toISOString() };
    },
    stopAudit() { auditKeys = null; auditTrail.clear();return { active:false }; },
    auditUi(knownKeys = []) {
      if(languageMode==='en'||routeExcluded)return{observations:[],unmatchedCount:0,protectedCount:0,languageMode:'en',intentionalEnglish:languageMode==='en',routeExcluded};
      // Only return catalogued UI strings. Unknown text is counted, never copied out of the page.
      const auditStarted=performance.now();
      const known = new Map([...knownKeys,...customTemplateRules.map(r=>r.key),...TEMPLATE_RULES.map(r=>r.key)].filter(k => typeof k === 'string').map(k => [normalize(k), k]));
      const observations = new Map(); let unmatchedCount = 0; let protectedCount = 0; let visited = 0; let truncated = false;
      const scan = ++scanCount;
      refreshProjectNames(scan);
      const record = (key, state, kind) => { if (observations.get(key)?.state !== 'untranslated') observations.set(key, { key, state, kind }); };
      auditRoots: for (const root of observed) {
        if (performance.now()-auditStarted>80) {truncated=true;break;}
        if (root !== document && !root.host?.isConnected) continue;
        const walker = document.createTreeWalker(root === document ? (document.body || document.documentElement) : root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (++visited > 50000 || performance.now()-auditStarted>80) { truncated = true; break auditRoots; }
          const node = walker.currentNode, el = node.parentElement;
          if (!el || !node.textContent?.trim()) continue;
          if (blocked(el, scan)) { protectedCount++; continue; }
          if (!eligible(el, scan) || !visibleUi(el)) continue;
          const slot = nodeSlots.get(node)?.get('');
          const original = normalize(slot?.original ?? node.textContent), current = normalize(node.textContent);
          const matches=slot?.dictionaryVersion===dictionary.version?slot.matchedKeys??[]:[];
          if(matches.length){
            const groupOk=!slot.group||inlineGroups.get(slot.group)?.every(n=>n.nodeValue===nodeSlots.get(n)?.get('')?.last);
            for(const match of matches)if(known.has(normalize(match)))record(known.get(normalize(match)),languageMode==='zh'&&current===normalize(slot.last)&&groupOk?'verified':'untranslated',slot.group?'template':inferKind(el));
            continue;
          }
          const key = known.get(original);
          if (key) record(key, current !== original && /[\u3400-\u9fff]/.test(current) ? 'verified' : 'untranslated', inferKind(el));
          else if (/^Worked for\s+(\d+.*)$/i.test(original)) record('Worked for {duration}', current !== original && /[\u3400-\u9fff]/.test(current) ? 'verified' : 'untranslated', 'template');
          else if (/^Resets in (?:<1m|\d+[dhms](?:\s+\d+[dhms])*)$/.test(original)) record('Resets in {duration}', current !== original ? 'verified' : 'untranslated', 'template');
          else if (/^(?:(?:\d+[smhd]|Weekly|Daily))\s+limit,\s*resets\s+in\s+(?:<1m|\d+[dhms](?:\s+\d+[dhms])*)$/i.test(original)) record('{window} limit, resets in {duration}', current !== original ? 'verified' : 'untranslated', 'template');
          else if (isValidUiText(current)) unmatchedCount++;
        }
        for (const el of root.querySelectorAll('[title],[aria-label],[placeholder],[data-tooltip]')) {
          if (++visited > 50000 || performance.now()-auditStarted>80) { truncated = true; break auditRoots; }
          if (!visibleUi(el)) continue;
          for (const attr of TRANSLATABLE_ATTRS) {
            if (!el.hasAttribute(attr) || !attributeAllowed(el,attr)) continue;
            const current = normalize(el.getAttribute(attr));
            const attributeSlot=nodeSlots.get(el)?.get(attr);
            const original = normalize(attributeSlot?.original ?? current), key = known.get(original);
            if(attributeSlot?.dictionaryVersion===dictionary.version&&attributeSlot.matchedKeys?.length){for(const match of attributeSlot.matchedKeys)if(known.has(normalize(match)))record(known.get(normalize(match)),languageMode==='zh'&&current===normalize(attributeSlot.last)?'verified':'untranslated','attribute');continue;}
            if (key) record(key,current !== original && /[\u3400-\u9fff]/.test(current) ? 'verified' : 'untranslated','attribute');
          }
        }
        if (truncated) break;
      }
      const recent=[...auditTrail.values()];auditTrail.clear();
      maxSliceMs=Math.max(maxSliceMs,performance.now()-auditStarted);
      return { observations: [...observations.values()], recent, unmatchedCount, protectedCount, truncated, auditActive: !!auditKeys && Date.now() < auditExpires };
    },
    state() {
      return {
        active, version: dictionary.version, translatedNodes: activeNodes.size,
        groups: inlineGroupContainers.size,
        observedRoots: observed.size, pending: waiting.size + settingsWaiting.size + pending.size,
        scanCount, maxSliceMs, lastCollectionTruncated, languageMode,routeExcluded,runtimeId:options.runtimeId,
        reconcileChecks, reconcilePasses, reconcilePending: reconcileQueue ? reconcileQueue.nodes.length - reconcileQueue.index : 0,
        capabilities: TEMPLATE_CAPABILITIES,
        unsupportedGroups: unsupportedInlineGroupSet.size,
        skippedRestores, queueTrimmed, droppedBatches
      };
    },
    dispose(opts) {
      if (!opts?.keepHud) { try { globalThis.__GRAVITYBOX_HUD_V1__?.dispose?.(); } catch {} }
      auditKeys = null; auditTrail.clear();
      active = false; observer.disconnect(); clearTimeout(timer); timer = null; reconcileQueue = null;
      ++updateGeneration; if (updateTimer !== null) { clearTimeout(updateTimer); updateTimer = null; }
      if (routeTimer) { clearInterval(routeTimer); routeTimer = null; }
      try { window.removeEventListener('popstate', checkRoute); window.removeEventListener('hashchange', checkRoute); } catch {}
      pending.clear(); waiting.clear(); settingsWaiting.clear();
      removeFocusListeners();
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeydown, true);
      }
      if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
      const toast = document.getElementById('__gravitybox_toast__');
      if (toast) toast.remove();

      const style = document.getElementById('__gravitybox_micro_patch__');
      if (style) style.remove();
      let restored = 0; let skipped = 0;
      for (const node of activeNodes) {
        if (node.isConnected) {
          const slots = nodeSlots.get(node);
          if (slots) for (const [attr, slot] of slots) {
            if (getValue(node, attr) === slot.last) { setValue(node, attr, slot.original); restored++; } else skipped++;
            const el = attr ? node : node.parentElement;
            if (el && el.nodeType === Node.ELEMENT_NODE) delete el.dataset.gravityboxLoc;
          }
        }
      }
      skippedRestores = skipped;
      for (const ref of ownedProjectMarkers) ref.deref()?.classList.remove('gravitybox-project-name'); ownedProjectMarkers.clear();
      pluginCards = []; pluginCardsAt = -1; settingsPaneCache = null; settingsScope = null; settingsScopeScan = -1;
      if (globalThis.__GRAVITYBOX_BOOT__ === options) delete globalThis.__GRAVITYBOX_BOOT__;
      activeNodes.clear(); observed.clear(); inlineGroupContainers.clear(); unsupportedInlineGroupSet.clear(); delete globalThis[KEY];
      return { restored, skipped, active: false };
    }
  };

  let toastTimer = null;
  function showToast(message, duration=1200) {
    try {
      if (typeof document === 'undefined') return;
      let toast = document.getElementById('__gravitybox_toast__');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = '__gravitybox_toast__';
        toast.setAttribute('data-gravitybox-protect', 'true');
        Object.assign(toast.style, {
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: '2147483647',
          pointerEvents: 'none',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '500',
          lineHeight: '1.4',
          fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          color: '#ffffff',
          background: 'rgba(30, 30, 35, 0.78)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)',
          transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: 'translateY(-4px)',
          opacity: '0',
        });
        (document.body || document.documentElement).appendChild(toast);
      }
      const reduceMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      toast.style.transition=reduceMotion?'none':'opacity 0.25s ease, transform 0.25s ease';
      toast.textContent = message;
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-4px)';
        toastTimer = setTimeout(() => {
          if (toast && toast.parentNode) toast.remove();
          toastTimer = null;
        }, 300);
      }, duration);
    } catch {}
  }

  function handleKeydown(event) {
    const target = event.composedPath?.()[0];
    const focused = target?.nodeType === Node.ELEMENT_NODE ? target : document.activeElement;
    if (!shortcutEnabled || event.repeat || event.defaultPrevented || routeExcluded || focused?.closest?.('input,textarea,[contenteditable]:not([contenteditable="false"]),.monaco-editor,.xterm,[role="textbox"],[role="combobox"]')) return;
    if (event.metaKey && event.altKey && (event.code === 'KeyL' || event.key === 'l' || event.key === 'L')) {
      event.preventDefault();
      event.stopPropagation();
      const res = api.toggleLanguage();
      const msg = res.mode === 'zh'
        ? 'GravityBox · 已切换为简体中文 (⌥⌘L)'
        : 'GravityBox · Switched to English (⌥⌘L)';
      showToast(msg);
    }
  }

  if (typeof window !== 'undefined' && options.path === '/fixture') {
    window.addEventListener('keydown', handleKeydown, true);
  }

  globalThis[KEY] = api;
  globalThis.__GRAVITYBOX_ATTACH_DEEP_SCAN__?.();
  globalThis.__GRAVITYBOX_ATTACH_HUD__?.();
  try {
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    /* pushState() fires no event of its own; a light poll plus the flush/observer checks above catch
       in-app navigation even when the router swaps the URL before it renders the new view. */
    routeTimer = setInterval(checkRoute, 500);
    if (typeof routeTimer?.unref === 'function') routeTimer.unref();
  } catch {}
  observe(document); schedule(document);
})();
