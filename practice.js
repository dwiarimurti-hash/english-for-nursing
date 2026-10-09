/* English for Nursing – interactive practice (Belajar Cepat Bahasa Inggris untuk Perawat) */
(function () {
  const P = window.PRACTICE;
  const key = (k) => 'efn-' + P.ch + '-' + k;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(key(k))); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) {} }
  };
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
    document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.id !== b.dataset.tab));
    store.set('tab', b.dataset.tab);
  }));
  const lastTab = store.get('tab');
  if (lastTab) { const b = document.querySelector('.tabs button[data-tab="' + lastTab + '"]'); if (b) b.click(); }

  /* ---------- quiz ---------- */
  function renderQuiz() {
    const box = $('#quiz-list'); box.innerHTML = '';
    let answered = 0, correct = 0;
    const total = P.quiz.length;
    const score = $('#quiz-score');
    const update = () => {
      score.textContent = correct + ' / ' + total + ' correct' + (answered < total ? ' · ' + (total - answered) + ' left' : '');
      if (answered === total) {
        const pct = Math.round((correct / total) * 100);
        const best = Math.max(pct, store.get('quizBest') || 0);
        store.set('quizBest', best);
        $('#quiz-done').hidden = false;
        $('#quiz-done').innerHTML = '<strong>Your score: ' + pct + '%</strong> (best: ' + best + '%). ' +
          (pct >= 80 ? 'Excellent – you are ready for the chapter exercises.' : 'Review the Skills Lab, then try again.');
      }
    };
    P.quiz.forEach((it, qi) => {
      const card = el('div', 'q');
      card.appendChild(el('p', 'qt', '<span class="n">' + (qi + 1) + '</span> ' + esc(it.q)));
      const opts = el('div', 'opts');
      const order = shuffle(it.o.map((t, i) => ({ t, i })));
      const fb = el('p', 'fb'); fb.hidden = true;
      order.forEach(({ t, i }) => {
        const b = el('button', 'opt', esc(t)); b.type = 'button';
        b.addEventListener('click', () => {
          if (card.dataset.done) return;
          card.dataset.done = '1'; answered++;
          const ok = i === it.a; if (ok) correct++;
          b.classList.add(ok ? 'right' : 'wrong');
          opts.querySelectorAll('.opt').forEach((x, k) => { if (order[k].i === it.a) x.classList.add('right'); x.disabled = true; });
          fb.hidden = false; fb.className = 'fb ' + (ok ? 'ok' : 'no');
          fb.innerHTML = (ok ? '✓ Correct. ' : '✗ Not quite. ') + esc(it.w);
          update();
        });
        opts.appendChild(b);
      });
      card.appendChild(opts); card.appendChild(fb); box.appendChild(card);
    });
    $('#quiz-done').hidden = true; update();
  }
  $('#quiz-reset').addEventListener('click', renderQuiz);
  renderQuiz();

  /* ---------- speech ---------- */
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ''));
    u.lang = 'en-GB'; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  /* ---------- flashcards ---------- */
  let deck = P.cards.map((c, i) => Object.assign({ id: i }, c));
  let pos = 0; let known = new Set(store.get('known') || []);
  const card = $('#fc-card');
  function showCard(flip) {
    const c = deck[pos];
    card.classList.toggle('flipped', !!flip);
    $('#fc-front').innerHTML = esc(c.front);
    $('#fc-back').innerHTML = c.back.map(([h, v]) => '<div><span>' + esc(h) + '</span>' + esc(v) + '</div>').join('');
    $('#fc-pos').textContent = (pos + 1) + ' / ' + deck.length + ' · known: ' + known.size + ' / ' + P.cards.length;
    $('#fc-known').setAttribute('aria-pressed', known.has(c.id));
  }
  card.addEventListener('click', () => card.classList.toggle('flipped'));
  $('#fc-next').addEventListener('click', () => { pos = (pos + 1) % deck.length; showCard(); });
  $('#fc-prev').addEventListener('click', () => { pos = (pos - 1 + deck.length) % deck.length; showCard(); });
  $('#fc-shuffle').addEventListener('click', () => { deck = shuffle(deck); pos = 0; showCard(); });
  $('#fc-say').addEventListener('click', (e) => { e.stopPropagation(); speak(deck[pos].front); });
  $('#fc-known').addEventListener('click', () => {
    const id = deck[pos].id; known.has(id) ? known.delete(id) : known.add(id);
    store.set('known', [...known]); showCard(card.classList.contains('flipped'));
  });
  if (!('speechSynthesis' in window)) $('#fc-say').hidden = true;
  showCard();

  /* ---------- dictation ---------- */
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' -]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  function diff(target, typed) {
    const a = norm(target), b = norm(typed);
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const hit = new Set(); let i = 0, j = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { hit.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    return { words: a.map((w, k) => ({ w, ok: hit.has(k) })), pct: a.length ? Math.round((hit.size / a.length) * 100) : 0 };
  }
  const dbest = store.get('dictBest') || {};
  P.say.forEach((s, i) => {
    const box = el('div', 'dict');
    box.innerHTML = '<div class="row"><span class="n">' + (i + 1) + '</span><audio controls preload="none" src="' + s.file + '"></audio></div>' +
      '<textarea rows="2" placeholder="Type what you hear…" aria-label="Sentence ' + (i + 1) + '"></textarea>' +
      '<div class="row"><button type="button" class="chk">Check</button><button type="button" class="show ghost">Show answer</button></div><p class="res" hidden></p>';
    const ta = $('textarea', box), res = $('.res', box);
    $('.chk', box).addEventListener('click', () => {
      const r = diff(s.text, ta.value);
      dbest[i] = Math.max(r.pct, dbest[i] || 0); store.set('dictBest', dbest);
      res.hidden = false;
      res.innerHTML = '<strong>' + r.pct + '%</strong> of the words are correct. ' + r.words.map((x) => '<span class="' + (x.ok ? 'w-ok' : 'w-no') + '">' + esc(x.w) + '</span>').join(' ');
    });
    $('.show', box).addEventListener('click', () => { res.hidden = false; res.innerHTML = 'Answer: <em>' + esc(s.text) + '</em>'; });
    $('#dict-list').appendChild(box);
  });

  /* ---------- shadowing ---------- */
  const canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  if (!canRec) $('#sh-norec').hidden = false;
  P.say.forEach((s, i) => {
    const box = el('div', 'dict');
    box.innerHTML = '<p class="st"><span class="n">' + (i + 1) + '</span> ' + esc(s.text) + '</p>' +
      '<div class="row"><button type="button" class="play">▶ Model</button><button type="button" class="rec"' + (canRec ? '' : ' disabled') + '>● Record</button>' +
      '<button type="button" class="mine ghost" disabled>▶ My voice</button><span class="hint"></span></div>';
    const model = new Audio(s.file); model.preload = 'none';
    let rec = null, chunks = [], url = null, timer = null;
    const hint = $('.hint', box), recB = $('.rec', box), mine = $('.mine', box);
    $('.play', box).addEventListener('click', () => { model.currentTime = 0; model.play(); });
    recB.addEventListener('click', async () => {
      if (rec && rec.state === 'recording') { rec.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream); chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop()); clearTimeout(timer);
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
          mine.disabled = false; recB.textContent = '● Record again'; recB.classList.remove('on');
          hint.textContent = 'Listen and compare with the model.';
        };
        rec.start(); recB.textContent = '■ Stop'; recB.classList.add('on'); hint.textContent = 'Recording… speak now.';
        timer = setTimeout(() => rec.state === 'recording' && rec.stop(), 15000);
      } catch (e) { hint.textContent = 'Microphone not available. Allow microphone access and try again.'; }
    });
    mine.addEventListener('click', () => { if (url) new Audio(url).play(); });
    $('#sh-list').appendChild(box);
  });
})();
