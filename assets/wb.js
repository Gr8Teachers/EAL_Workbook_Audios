(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  if (window.top !== window.self) { var bk = $('.backlink'); if (bk) bk.style.display = 'none'; }

  // Audio players + speed buttons
  $$('.track').forEach(function (t) {
    var au = $('audio', t), sp = $('.speed', t);
    if (!au || !sp) return;
    au.addEventListener('error', function () { au.style.display = 'none'; sp.style.display = 'none'; var m = $('.missing', t); if (m) m.classList.remove('hidden'); });
    $$('button', sp).forEach(function (b) {
      b.onclick = function () { au.playbackRate = +b.dataset.rate; $$('button', sp).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); };
    });
  });
  // Only one audio plays at a time
  $$('audio').forEach(function (a) { a.addEventListener('play', function () { $$('audio').forEach(function (o) { if (o !== a) o.pause(); }); }); });

  // Tick boxes
  $$('.wb td.box').forEach(function (c) {
    c.tabIndex = 0; c.setAttribute('role', 'checkbox'); c.setAttribute('aria-checked', 'false');
    function toggle() {
      var tbl = c.closest('table');
      clearMarks(tbl);
      if (tbl.classList.contains('single') && !c.classList.contains('on')) {
        $$('td.box', tbl).forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      }
      c.classList.toggle('on'); c.setAttribute('aria-checked', c.classList.contains('on'));
    }
    c.onclick = toggle;
    c.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } };
  });
  function clearMarks(scope) { $$('td.box', scope).forEach(function (x) { x.classList.remove('right', 'wrong'); }); }

  // Write-in cells
  $$('.wb td.fill').forEach(function (c) {
    var ed = document.createElement('div'); ed.contentEditable = 'true'; ed.className = 'typed'; ed.setAttribute('aria-label', 'Type your answer');
    c.insertBefore(ed, c.firstChild);
    c.addEventListener('click', function () { ed.focus(); });
  });

  var root = $('main'), score = $('.score');
  var check = $('#check'), show = $('#show'), reset = $('#reset');
  var keyed = $$('.wb td.box[data-key]');
  if (check) {
    if (!keyed.length) check.style.display = 'none';
    check.onclick = function () {
      var right = 0, total = 0;
      $$('.wb table').forEach(function (t) {
        var boxes = $$('td.box[data-key]', t); if (!boxes.length) return;
        total++;
        var ok = boxes.every(function (b) { return b.classList.contains('on') === (b.dataset.key === '1'); });
        if (ok) right++;
        boxes.forEach(function (b) {
          b.classList.remove('right', 'wrong');
          if (b.classList.contains('on')) b.classList.add(b.dataset.key === '1' ? 'right' : 'wrong');
        });
      });
      score.textContent = 'You got ' + right + ' out of ' + total + ' right.';
      score.classList.remove('hidden');
    };
  }
  if (show) {
    if (!$('.answers') && !$$('.wb .ans').length && !keyed.length) show.style.display = 'none';
    show.onclick = function () {
      var on = root.classList.toggle('reveal');
      show.textContent = on ? 'Hide answers' : 'Show answers';
    };
  }
  if (reset) reset.onclick = function () {
    $$('.wb td.box').forEach(function (b) { b.classList.remove('on', 'right', 'wrong'); b.setAttribute('aria-checked', 'false'); });
    $$('.wb .typed').forEach(function (e) { e.textContent = ''; });
    root.classList.remove('reveal'); if (show) show.textContent = 'Show answers';
    if (score) score.classList.add('hidden');
  };
})();
