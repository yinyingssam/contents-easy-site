// 강의 내용 탭
(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
})();

// 유입 채널 기억하기: UTM이 붙은 링크로 들어오면 30일 동안 기억한다(마지막 UTM 기준).
// UTM이 없으면 외부 사이트에서 왔을 때 그 사이트 주소(도메인)만 기억한다.
const UTM_KEY = 'ce-source';
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_DAYS = 30;

const readSource = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(UTM_KEY) || 'null');
    if (saved && Date.now() - saved.at < UTM_DAYS * 86400000) return saved;
  } catch {}
  return null;
};

(() => {
  const params = new URLSearchParams(location.search);
  const utm = {};
  UTM_FIELDS.forEach((k) => { const v = params.get(k); if (v) utm[k] = v.trim().slice(0, 100); });
  let ref = '';
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    if (host && host !== location.hostname) ref = host.replace(/^www\./, '');
  } catch {}
  const prev = readSource();
  let next = null;
  if (Object.keys(utm).length) next = { ...utm, referrer: ref, at: Date.now() };
  else if (ref && (!prev || !prev.utm_source)) next = { referrer: ref, at: Date.now() };
  if (next) { try { localStorage.setItem(UTM_KEY, JSON.stringify(next)); } catch {} }
})();

// 신청 폼
(() => {
  const form = document.getElementById('apply-form');
  const msg = form.querySelector('.form-msg');
  const button = form.querySelector('button[type="submit"]');
  const show = (text, kind) => {
    msg.textContent = text;
    msg.className = `form-msg is-${kind}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.value.trim(),
      contact: form.contact.value.trim(),
      kind: form.querySelector('input[name="kind"]:checked')?.value || '',
      consent: form.consent.checked,
      website: form.website.value,
    };
    const source = readSource();
    if (source) {
      UTM_FIELDS.forEach((k) => { if (source[k]) data[k] = source[k]; });
      if (source.referrer) data.referrer = source.referrer;
    }
    if (!data.name) return show('이름을 적어 주세요.', 'error'), form.name.focus();
    if (!data.contact) return show('연락처를 적어 주세요.', 'error'), form.contact.focus();
    if (!data.kind) return show('신청 종류를 골라 주세요.', 'error');
    if (!data.consent) return show('개인정보 수집·이용에 동의해 주세요.', 'error'), form.consent.focus();

    button.disabled = true;
    show('신청을 보내는 중이에요.', 'ok');
    try {
      const r = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || '신청을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      form.classList.add('is-done');
      show('신청이 접수됐어요. 확인 후 연락드릴게요.', 'ok');
    } catch (err) {
      show(err.message || '신청을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
