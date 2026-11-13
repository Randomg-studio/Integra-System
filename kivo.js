/* Kivo Agentes · chat para la web de los clientes de FlexGo.
   Uso: <script src="https://logrin.flexgogroup.com/kivo.js" data-negocio="CLAVE" defer></script>
   Todo lo importante pasa en el servidor: si el cliente está apagado o la web no es suya, el chat no aparece. */
(() => {
  const script = document.currentScript;
  const clave = script && script.dataset.negocio;
  if (!clave || window.__kivoAgentes) return;
  window.__kivoAgentes = true;

  const URL = 'https://owtweebqlmoarbsvtiau.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_YvFAhbXHG1UxlXDnUny5Uw_sRVWE0Wv'; // clave pública de Logrin
  const GUARDADO = 'kivo-ag-' + clave;
  const color = (script.dataset.color || '#102449').replace(/[^#a-zA-Z0-9(),.% ]/g, '');

  const rpc = async (fn, args) => {
    const r = await fetch(URL + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
      body: JSON.stringify(args),
    });
    const t = await r.text();
    let d = null;
    try { d = t ? JSON.parse(t) : null; } catch { d = null; }
    if (!r.ok) throw new Error((d && d.message) || 'No se pudo conectar. Inténtalo de nuevo.');
    return d;
  };
  const leerSesion = () => { try { return JSON.parse(localStorage.getItem(GUARDADO) || 'null'); } catch { return null; } };
  const guardarSesion = (v) => { try { v ? localStorage.setItem(GUARDADO, JSON.stringify(v)) : localStorage.removeItem(GUARDADO); } catch { /* sin almacenamiento */ } };

  const iniciar = async () => {
    let info;
    try { info = await rpc('kivo_w_iniciar', { p_clave: clave }); } catch { return; }
    if (!info || !info.disponible) return;

    const host = document.createElement('div');
    host.setAttribute('data-kivo-agentes', '');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
        .lanzar { position: fixed; right: 18px; bottom: 18px; z-index: 2147483000; width: 58px; height: 58px; border-radius: 50%;
          border: 0; background: ${color}; color: #fff; cursor: pointer; box-shadow: 0 8px 24px rgba(16,36,73,.28); display: grid; place-items: center; }
        .lanzar svg { width: 28px; height: 28px; }
        .panel { position: fixed; right: 18px; bottom: 88px; z-index: 2147483000; width: min(370px, calc(100vw - 24px));
          height: min(540px, calc(100vh - 110px)); background: #fff; border-radius: 16px; box-shadow: 0 18px 48px rgba(16,36,73,.28);
          display: flex; flex-direction: column; overflow: hidden; color: #102449; }
        .panel[hidden] { display: none; }
        header { background: ${color}; color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
        header b { display: block; font-size: 15px; } header small { opacity: .85; font-size: 12px; }
        header button { margin-left: auto; background: transparent; border: 0; color: #fff; font-size: 22px; cursor: pointer; line-height: 1; }
        .msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; background: #F4F6FB; }
        .m { max-width: 85%; padding: 9px 12px; border-radius: 14px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; }
        .kivo { background: #fff; border: 1px solid #E2E7F2; align-self: flex-start; border-bottom-left-radius: 4px; }
        .yo { background: ${color}; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
        .sistema { background: #FFF6E5; border: 1px solid #F3D9A4; align-self: flex-start; font-size: 13px; }
        .escribe { color: #69708C; font-size: 13px; align-self: flex-start; }
        form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #E2E7F2; background: #fff; }
        input { flex: 1; border: 1px solid #CBD3E3; border-radius: 10px; padding: 10px 12px; font-size: 16px; color: #102449; }
        input:focus { outline: 2px solid ${color}; outline-offset: 1px; }
        form button { border: 0; border-radius: 10px; background: ${color}; color: #fff; padding: 0 14px; font-weight: 600; cursor: pointer; }
        form button:disabled { opacity: .5; cursor: default; }
        .pie { text-align: center; font-size: 11px; color: #8A97AA; padding: 0 0 8px; background: #fff; }
        .pie a { color: inherit; }
      </style>
      <button class="lanzar" type="button" aria-label="Abrir el chat" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg>
      </button>
      <section class="panel" role="dialog" aria-label="Chat" hidden>
        <header><div><b></b><small></small></div><button type="button" aria-label="Cerrar el chat">×</button></header>
        <div class="msgs" aria-live="polite"></div>
        <form><input type="text" maxlength="1000" placeholder="Escribe tu mensaje…" aria-label="Tu mensaje" autocomplete="off"><button type="submit">Enviar</button></form>
        <div class="pie">Asistente virtual · <a href="https://flexgogroup.com" target="_blank" rel="noopener">Kivo de FlexGo</a></div>
      </section>`;
    document.body.appendChild(host);

    const $ = (s) => root.querySelector(s);
    const lanzar = $('.lanzar'), panel = $('.panel'), msgs = $('.msgs'), form = $('form'), input = $('input'), enviar = $('form button');
    $('header b').textContent = info.titulo;
    $('header small').textContent = info.subtitulo;

    let sesion = leerSesion();
    let desde = 0;
    let escribe = null;
    let temporizador = null;
    let espera = 1500;

    const pinta = (texto, clase) => {
      const p = document.createElement('div');
      p.className = 'm ' + clase;
      p.textContent = texto;
      msgs.appendChild(p);
      msgs.scrollTop = msgs.scrollHeight;
    };
    const mostrarEscribe = (si) => {
      if (si && !escribe) { escribe = document.createElement('div'); escribe.className = 'escribe'; escribe.textContent = 'Escribiendo…'; msgs.appendChild(escribe); }
      if (!si && escribe) { escribe.remove(); escribe = null; }
      msgs.scrollTop = msgs.scrollHeight;
    };

    const leer = async () => {
      if (!sesion) return false;
      const d = await rpc('kivo_w_leer', { p_chat: sesion.chat, p_token: sesion.token, p_desde: desde });
      if (d.fin) { sesion = null; guardarSesion(null); return false; }
      let hubo = false;
      for (const m of d.mensajes || []) {
        desde = Math.max(desde, m.id);
        if (m.de === 'visitante') continue;
        mostrarEscribe(false);
        pinta(m.texto, m.de === 'kivo' ? 'kivo' : 'sistema');
        hubo = true;
      }
      mostrarEscribe(Boolean(d.pensando));
      return hubo || d.pensando;
    };
    const programar = () => {
      clearTimeout(temporizador);
      if (!sesion || panel.hidden) return;
      temporizador = setTimeout(async () => {
        try { espera = (await leer()) ? 1500 : Math.min(espera * 1.6, 15000); } catch { espera = 15000; }
        programar();
      }, espera);
    };

    let saludado = false;
    const abrir = async (si) => {
      panel.hidden = !si;
      lanzar.setAttribute('aria-expanded', String(si));
      if (!si) { clearTimeout(temporizador); lanzar.focus(); return; }
      if (!saludado) {
        saludado = true;
        pinta(info.saludo, 'kivo');
        if (sesion) {
          // Recupera la conversación de antes, sin repetir lo que dijo el visitante.
          try {
            const d = await rpc('kivo_w_leer', { p_chat: sesion.chat, p_token: sesion.token, p_desde: 0 });
            if (d.fin) { sesion = null; guardarSesion(null); }
            for (const m of d.mensajes || []) { desde = Math.max(desde, m.id); pinta(m.texto, m.de === 'visitante' ? 'yo' : m.de === 'kivo' ? 'kivo' : 'sistema'); }
            mostrarEscribe(Boolean(d.pensando));
          } catch { /* se intentará al escribir */ }
        }
      }
      espera = 1500;
      programar();
      input.focus();
    };

    lanzar.addEventListener('click', () => abrir(true));
    $('header button').addEventListener('click', () => abrir(false));
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) abrir(false); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      enviar.disabled = true;
      pinta(texto, 'yo');
      mostrarEscribe(true);
      try {
        const r = await rpc('kivo_w_enviar', { p_clave: clave, p_chat: sesion ? sesion.chat : null, p_token: sesion ? sesion.token : null, p_texto: texto });
        if (!sesion || sesion.chat !== r.chat) { sesion = { chat: r.chat, token: r.token }; guardarSesion(sesion); }
        espera = 1500;
        await leer();
        programar();
      } catch (err) {
        mostrarEscribe(false);
        if (/ya no existe/.test(err.message)) { sesion = null; guardarSesion(null); }
        pinta(err.message, 'sistema');
      } finally {
        enviar.disabled = false;
        input.focus();
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
