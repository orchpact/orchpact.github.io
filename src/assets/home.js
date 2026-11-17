(function (root) {
  'use strict';

  // These are local, illustrative records. This page never calls a runtime or provider.
  const unit = {
    key: 'analysis', name: '分析团队', purpose: '核对记录并交付结果', model: 'reasoning',
    crew: {process: 'sequential', members: [
      {key: 'analyst', name: '分析员', role: '核对原始记录', instruction: '提交有依据的工作记录', capabilities: ['text', 'json']},
      {key: 'writer', name: '编写员', role: '形成最终交付', instruction: '依据团队记录交付 result.json', capabilities: ['text', 'json']}
    ]}
  };
  const contracts = {
    definition: {file: 'workflow.json · units[] 片段', value: unit, caption: 'reasoning 是能力槽位。实际模型标识留在使用方绑定中。'},
    binding: {file: 'POST /api/v1/apps/{app}/install · 请求体', value: {bindings: {models: {reasoning: 'local-text-profile'}}}, caption: '安装时明确绑定模型。binding_revision 与 expected_revision 同时检查预览是否仍有效。'},
    snapshot: {file: 'GET /api/v1/apps/{app}/runs/{id} · 选取字段', value: {
      workflow: {id: 'department-review', revision: 1, sha256: '<definition-sha256>', application_binding_revision: 1, bindings: {models: {reasoning: 'local-text-profile'}}},
      crew_runs: [{id: '<crew-id>', status: 'completed', roster: [{key: 'analyst', agent_id: '<agent-id>'}, {key: 'writer', agent_id: '<another-agent-id>'}]}]
    }, caption: '运行保留来源与资源绑定。crew_runs 将本次岗位与真实 Crew、Agent ID 关联；此处为字段示意。'}
  };

  const admission = {
    label: '身份与准入', badge: 'ADMISSION', title: '先明确这是谁的委托。',
    description: '在服务端校验应用签名、Workspace 成员身份、幂等键及输入契约；付款人来自发起委托的身份。',
    recordLabel: '准入边界 · 选取字段示意', record: {application: 'example-app', workspace: 'workspace-a', idempotency: 'key + content fingerprint', payer: 'initiating user'},
    note: '共享定义不会混合应用身份、工作空间或余额。'
  };
  const snapshot = {
    label: '冻结工作快照', badge: 'SNAPSHOT', title: '保存本次执行所依据的约定。',
    description: '冻结工作项的职责、岗位、模型和限制，并保存工作流来源与原付款人。后来修改声明，不会改写这份快照。',
    recordLabel: '工作项快照 · 概念示意', record: {workflow_revision: 1, participants: ['analyst', 'writer'], profile: 'local-text-profile', limits: {model_steps: 12, tool_steps: 8, seconds: 300}},
    note: '同一 attempt 的全部成员与辅助 Crew 共享执行额度。'
  };
  const crew = {
    label: '启动执行团队', badge: 'CREWAI', title: '为当前工作装配新的 Crew。',
    description: '为参与岗位创建独立 Agent 和 Task。CrewAI 顺序推进任务，前一岗位的 notes 经 Task context 交给后一岗位，最后一岗提交候选 JSON。',
    recordLabel: '运行对象 · 概念示意', record: {crew: 'fresh instance', process: 'sequential', tasks: ['analyst', 'writer'], context: 'previous Tasks', result: 'candidate JSON'},
    note: '长期复用的是声明；上下文、工具缓存和 Agent 对象不跨运行共享。'
  };
  const effect = {
    label: '受控外部调用', badge: 'EFFECT', title: '每一次外部调用都重新过边界。',
    description: 'BaseLLM 与 BaseTool 回到平台服务。检查当前身份、岗位能力、授权和额度，再预留费用、发出请求、保存回执并按实际用量结算。',
    recordLabel: '调用与账务 · 选取字段示意', record: {request: {kind: 'model', status: 'completed'}, accounting: {state: 'settled'}, receipt: 'persisted', payer: 'original initiating user'},
    note: '模型步骤与实际 API 请求分开记录；协议修正的请求也分别计费。'
  };
  const artifact = {
    label: '登记当前产物', badge: 'CONTRACT', title: '把候选输出变成可核验产物。',
    description: '平台校验 JSON Schema、文件约束与已声明的一致性规则，再登记不可变产物。独立审校读取当前实际依赖，结构通过仍须等待对应验收。',
    recordLabel: '产物身份 · 概念示意', record: {artifact: 'artifact-a', file: 'result.json', sha256: '<content-sha256>', generation: 1, review: 'pending'},
    note: '产物与原始回执保存在配套文件中；权限检查覆盖下载与读取。'
  };
  const accepted = {
    label: '审校后接受交付', badge: 'ACCEPTED', title: '验收的是这份产物的这个版本。',
    description: '独立审校通过当前产物，适用的验收规则满足后，平台才接受最终交付。完成状态、产物身份与账务记录各自保留。',
    recordLabel: '验收关联 · 概念示意', record: {artifact: 'artifact-a', generation: 1, review: {passed: true, reviewed_artifact_ids: ['artifact-a']}, run_status: 'completed'},
    note: '专业内容的可靠性仍需具体评估，平台保证的是已声明规则的执行。'
  };
  const rejection = {
    label: '审校定位缺口', badge: 'REWORK', tone: 'warning', title: '审校失败，定向回到负责的阶段。',
    description: '审校记录具体问题和责任节点，平台在返工额度内重做受影响的上游与下游。已有产物保留，旧稿不会被新稿覆盖。',
    recordLabel: '缺陷反馈 · 概念示意', record: {artifact: 'artifact-a', review: {passed: false, issues: [{node_key: 'analysis', field: 'total', reason: '与原始记录不一致'}]}, next: 'bounded targeted rework'},
    note: '审校是独立工作项；返工继续受项目预算与生命周期上限约束。'
  };
  const revised = {
    label: '登记修订产物', badge: 'GENERATION 2', title: '新产物需要与它对应的新验收。',
    description: '新的团队启动重新完成受影响工作，交付 artifact-b。保留 artifact-a 和它的审校记录；旧的通过或拒绝结论不能代替新稿验收。',
    recordLabel: '修订身份 · 概念示意', record: {previous_artifact: 'artifact-a', artifact: 'artifact-b', generation: 2, sha256: '<new-content-sha256>', review: 'pending'},
    note: '同一个文件名可以对应多个不可变版本，身份和哈希明确区分。'
  };
  const reaccepted = {
    ...accepted, title: '重新审校，再接受修订稿。',
    description: '审校读取最新产物与依赖，填写当前产物 ID。generation 2 经过对应的新验收后，平台交付 artifact-b，旧稿及其记录仍可核验。',
    record: {artifact: 'artifact-b', generation: 2, review: {passed: true, reviewed_artifact_ids: ['artifact-b']}, run_status: 'completed'}
  };
  const pending = {
    label: '请求已经发出', badge: 'IN FLIGHT', title: '请求发出后，取消也可能已产生费用。',
    description: '平台已经完成授权与预留，并向供应商发送请求。外部系统与本地事务不是同一个原子边界，响应尚未确认时不能推断调用没有发生。',
    recordLabel: '在途请求 · 选取字段示意', record: {request: {kind: 'model', status: 'started'}, accounting: {state: 'held', settled_points: null}, response: 'not yet confirmed'},
    note: '预留与实际费用分开；未知用量不会写成零。'
  };
  const unknown = {
    label: '先核对真实回执', badge: 'UNKNOWN', tone: 'warning', title: '未知结果，先恢复证据。',
    description: '重启后先恢复已保存的回执与结算。缺少确认回执的步骤保留 unknown，工作项为 interrupted；平台不自动重发未知的付费请求。',
    recordLabel: '恢复边界 · 选取字段示意', record: {request: {status: 'unknown'}, accounting: {state: 'held', settled_points: null}, work_item: 'interrupted', automatic_replay: false},
    note: '核对真实回执后再作明确决定；重试保留原付款人与幂等边界。'
  };
  const scenarios = {
    normal: [admission, snapshot, crew, effect, artifact, accepted],
    repair: [admission, snapshot, crew, effect, artifact, rejection, revised, reaccepted],
    unknown: [admission, snapshot, crew, pending, unknown]
  };
  const initialState = () => ({scenario: 'normal', index: 0});
  function transition(state, action) {
    if (action.type === 'scenario' && Object.hasOwn(scenarios, action.value)) return {scenario: action.value, index: 0};
    const frames = scenarios[state.scenario] || scenarios.normal;
    let index = state.index;
    if (action.type === 'next') index += 1;
    if (action.type === 'previous') index -= 1;
    if (action.type === 'select' && Number.isInteger(action.index)) index = action.index;
    return {...state, index: Math.min(frames.length - 1, Math.max(0, index))};
  }

  function highlight(node, text) {
    const document = node.ownerDocument;
    const fragment = document.createDocumentFragment();
    const tokens = /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null|\d+)\b/g;
    let end = 0, match;
    while ((match = tokens.exec(text))) {
      fragment.append(document.createTextNode(text.slice(end, match.index)));
      const span = document.createElement('span');
      span.className = match[2] ? 'code-key' : match[1] ? 'code-string' : 'code-literal';
      span.textContent = match[0];
      fragment.append(span);
      end = tokens.lastIndex;
    }
    fragment.append(document.createTextNode(text.slice(end)));
    node.replaceChildren(fragment);
  }

  function mount(document) {
    const byId = id => document.getElementById(id);
    document.querySelectorAll('[data-enhance]').forEach(node => {node.hidden = false;});
    let state = initialState();
    const render = () => {
      const frames = scenarios[state.scenario], frame = frames[state.index];
      byId('event-index').textContent = `EVENT ${String(state.index + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
      byId('event-badge').textContent = frame.badge;
      byId('event-badge').dataset.tone = frame.tone || 'normal';
      byId('event-title').textContent = frame.title;
      byId('event-description').textContent = frame.description;
      byId('event-record-label').textContent = frame.recordLabel;
      byId('event-note').textContent = frame.note;
      byId('lab-position').textContent = `${String(state.index + 1).padStart(2, '0')} — ${String(frames.length).padStart(2, '0')}`;
      highlight(byId('event-code'), JSON.stringify(frame.record, null, 2));
      byId('event-code').parentElement.scrollTop = 0;
      byId('event-code').parentElement.scrollLeft = 0;
      const rail = byId('event-rail'), preserveFocus = rail.contains(document.activeElement);
      rail.replaceChildren(...frames.map((entry, index) => {
        const item = document.createElement('li'), button = document.createElement('button'), number = document.createElement('span');
        button.type = 'button';
        number.textContent = String(index + 1).padStart(2, '0');
        button.append(number, document.createTextNode(entry.label));
        if (index === state.index) button.setAttribute('aria-current', 'step');
        button.dataset.completed = String(index < state.index);
        button.addEventListener('click', () => dispatch({type: 'select', index}));
        item.append(button); return item;
      }));
      const selected = rail.querySelector('[aria-current="step"]');
      if (preserveFocus) selected.focus({preventScroll: true});
      if (rail.scrollWidth > rail.clientWidth) {
        const left = selected.offsetLeft - rail.offsetLeft;
        if (left < rail.scrollLeft || left + selected.offsetWidth > rail.scrollLeft + rail.clientWidth) rail.scrollTo({left: Math.max(0, left - 20), behavior: 'auto'});
      }
      byId('event-prev').disabled = state.index === 0;
      const last = state.index === frames.length - 1;
      byId('event-next').disabled = last;
      byId('event-next').textContent = last ? (state.scenario === 'unknown' ? '等待回执核定' : '本场景结束') : '下一事件 →';
      document.querySelectorAll('[data-scenario]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scenario === state.scenario)));
    };
    function dispatch(action) {state = transition(state, action); render();}
    document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => dispatch({type: 'scenario', value: button.dataset.scenario})));
    byId('event-prev').addEventListener('click', () => dispatch({type: 'previous'}));
    byId('event-next').addEventListener('click', () => dispatch({type: 'next'}));
    render();

    const selectContract = key => {
      const value = contracts[key];
      highlight(byId('contract-code'), JSON.stringify(value.value, null, 2));
      byId('contract-code').parentElement.scrollTop = 0;
      byId('contract-code').parentElement.scrollLeft = 0;
      byId('contract-file').textContent = value.file;
      byId('contract-caption').textContent = value.caption;
      document.querySelectorAll('[data-contract]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.contract === key)));
    };
    document.querySelectorAll('[data-contract]').forEach(button => button.addEventListener('click', () => selectContract(button.dataset.contract)));
    selectContract('definition');

    let copyTimer;
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
      const node = byId(button.dataset.copy), status = byId('copy-status');
      clearTimeout(copyTimer);
      try {
        if (!root.navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await root.navigator.clipboard.writeText(node.textContent);
        status.textContent = '已复制到剪贴板';
      } catch (_) {
        const range = document.createRange(); range.selectNodeContents(node);
        const selection = root.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        status.textContent = '已选中代码，请使用系统复制快捷键';
      }
      status.dataset.visible = 'true';
      copyTimer = root.setTimeout(() => {status.dataset.visible = 'false';}, 3000);
    }));
    document.querySelectorAll('.mobile-nav a').forEach(link => link.addEventListener('click', () => link.closest('details').removeAttribute('open')));

    let scheduled = false;
    const progress = () => {
      const height = document.documentElement.scrollHeight - root.innerHeight;
      document.documentElement.style.setProperty('--reading-progress', String(height > 0 ? Math.min(1, Math.max(0, root.scrollY / height)) : 0));
      scheduled = false;
    };
    root.addEventListener('scroll', () => {if (!scheduled) {scheduled = true; root.requestAnimationFrame(progress);}}, {passive: true});
    progress();
    if ('IntersectionObserver' in root) {
      const observer = new root.IntersectionObserver(entries => {
        const active = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!active) return;
        document.querySelectorAll('.desktop-nav a[href^="#"]').forEach(link => {
          if (link.getAttribute('href') === '#' + active.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }, {rootMargin: '-10% 0px -55% 0px', threshold: 0});
      document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
    }
  }
  if (typeof module === 'object' && module.exports) module.exports = {contracts, scenarios, initialState, transition};
  if (typeof document !== 'undefined') mount(document);
})(typeof globalThis === 'undefined' ? this : globalThis);
