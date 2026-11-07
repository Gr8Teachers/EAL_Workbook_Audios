(function () {
  var A = window.ACT;
  var root = document.getElementById('app');
  if (window.top !== window.self) { var back = document.querySelector('main > p a[href="../"]'); if (back) back.parentNode.style.display = 'none'; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // Audio player with speed control
  var player = el('div', 'player');
  if (A.audio) {
    var au = document.createElement('audio');
    au.controls = true; au.preload = 'metadata'; au.src = A.audio;
    var miss = el('p', 'missing hidden', 'Audio for this activity is not uploaded yet.');
    au.addEventListener('error', function () { au.classList.add('hidden'); speed.classList.add('hidden'); miss.classList.remove('hidden'); });
    var speed = el('div', 'speed'); speed.appendChild(el('span', null, 'Speed:'));
    [0.75, 1, 1.25].forEach(function (r) {
      var b = el('button', r === 1 ? 'on' : '', r + '×');
      b.onclick = function () { au.playbackRate = r; speed.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); };
      speed.appendChild(b);
    });
    player.append(au, miss, speed);
  } else {
    player.appendChild(el('p', 'missing', 'Audio for this activity is not uploaded yet.'));
  }
  root.appendChild(player);

  if (A.type === 'repeat') repeat();
  else if (A.type === 'choose') choose();
  else if (A.type === 'write') write();

  // Transcript
  var d = el('details', 'transcript'); d.appendChild(el('summary', null, 'Show transcript'));
  var t = el('div'); t.innerHTML = A.transcript; d.appendChild(t); root.appendChild(d);

  // ---- Listen and repeat: tap each card after saying it
  function repeat() {
    var tools = el('div', 'tools');
    var shuffleBtn = el('button', null, 'Shuffle'), resetBtn = el('button', null, 'Start again'), prog = el('span', 'progress');
    tools.append(el('span', null, 'Tap a card after you say it.'), shuffleBtn, resetBtn, prog);
    root.appendChild(tools);
    var tiles = [], grids = [];
    A.sections.forEach(function (s) {
      if (s.heading) root.appendChild(el('h2', null, s.heading));
      var wide = s.rows.some(function (r) { return r.length > 1; });
      var g = el('div', 'grid' + (wide ? ' wide' : ''));
      s.rows.forEach(function (r, i) {
        var tile = el('div', 'tile'); tile.tabIndex = 0; tile.setAttribute('role', 'button');
        if (s.numbered) tile.appendChild(el('span', 'num', String(i + 1)));
        tile.appendChild(el('span', 'main', r[0]));
        if (r.length > 1) { var sub = el('span', 'sub'); r.slice(1).forEach(function (c) { sub.appendChild(el('span', null, c)); }); tile.appendChild(sub); }
        function toggle() { tile.classList.toggle('done'); update(); }
        tile.onclick = toggle;
        tile.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
        g.appendChild(tile); tiles.push(tile);
      });
      root.appendChild(g); grids.push(g);
    });
    var done = el('div', 'score hidden', 'Well done! You practised them all.');
    root.appendChild(done);
    function update() {
      var n = tiles.filter(function (t) { return t.classList.contains('done'); }).length;
      prog.textContent = n + ' / ' + tiles.length;
      done.classList.toggle('hidden', n !== tiles.length);
    }
    shuffleBtn.onclick = function () {
      grids.forEach(function (g) { var k = Array.from(g.children); for (var i = k.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); g.appendChild(k[j]); k.splice(j, 1); } k.forEach(function (c) { g.appendChild(c); }); });
    };
    resetBtn.onclick = function () { tiles.forEach(function (t) { t.classList.remove('done'); }); update(); };
    update();
  }

  // ---- Listen and choose the answer
  function choose() {
    var answered = 0, correct = 0;
    var score = el('div', 'score hidden');
    A.questions.forEach(function (q, i) {
      var box = el('div', 'q'); box.appendChild(el('div', 'label', 'Number ' + (i + 1)));
      var opts = el('div', 'opts'), fb = el('div', 'fb');
      q.options.forEach(function (o) {
        var b = el('button', null, o);
        b.onclick = function () {
          var ok = o === q.answer;
          b.classList.add(ok ? 'right' : 'wrong');
          if (ok) {
            fb.textContent = 'Correct!'; fb.className = 'fb right';
            opts.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
            if (!box.dataset.tried) correct++;
            answered++; finish();
          } else {
            fb.textContent = 'Try again.'; fb.className = 'fb wrong'; b.disabled = true;
            box.dataset.tried = '1';
          }
        };
        opts.appendChild(b);
      });
      box.append(opts, fb); root.appendChild(box);
    });
    var again = el('button', null, 'Try again');
    again.onclick = function () { location.reload(); };
    root.append(score, again);
    function finish() {
      if (answered < A.questions.length) return;
      score.textContent = 'You got ' + correct + ' out of ' + A.questions.length + ' right the first time.';
      score.classList.remove('hidden');
    }
  }

  // ---- Listen and write the letter
  function write() {
    var w = el('div', 'write'), inputs = [];
    A.answers.forEach(function (a, i) {
      var l = el('label', null, String(i + 1));
      var inp = document.createElement('input'); inp.maxLength = 1; inp.autocomplete = 'off'; inp.setAttribute('autocapitalize', 'characters');
      inp.oninput = function () { l.classList.remove('right', 'wrong'); if (inp.value && inputs[i + 1]) inputs[i + 1].focus(); };
      l.appendChild(inp); w.appendChild(l); inputs.push(inp);
    });
    root.appendChild(w);
    var tools = el('div', 'tools'), check = el('button', 'on', 'Check'), reset = el('button', null, 'Start again');
    tools.append(check, reset); root.appendChild(tools);
    var score = el('div', 'score hidden'); root.appendChild(score);
    check.onclick = function () {
      var c = 0;
      inputs.forEach(function (inp, i) {
        var ok = inp.value.trim().toUpperCase() === A.answers[i].toUpperCase();
        if (ok) c++;
        inp.parentNode.classList.remove('right', 'wrong');
        if (inp.value.trim()) inp.parentNode.classList.add(ok ? 'right' : 'wrong');
      });
      score.textContent = 'You got ' + c + ' out of ' + inputs.length + '.';
      score.classList.remove('hidden');
    };
    reset.onclick = function () { inputs.forEach(function (i) { i.value = ''; i.parentNode.classList.remove('right', 'wrong'); }); score.classList.add('hidden'); inputs[0].focus(); };
  }
})();
