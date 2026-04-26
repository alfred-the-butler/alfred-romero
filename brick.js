// Brick — adapted from straker's Basic Breakout (CC0)
// https://gist.github.com/straker/98a2aed6a7686d26c04810f08bfaf66b
// Tuned for the iPod Nano 4th gen LCD (164×194, below status bar).

const Brick = (() => {
  const W = 164, H = 194;
  const PAD_W = 34, PAD_H = 4;
  const BALL_R = 3;
  const ROWS = 5, COLS = 7;
  const BRICK_H = 7;
  const BRICK_GAP = 1;
  const BRICK_TOP = 16;
  const SPEED = 1.6;

  let canvas, ctx, raf;
  let paddle, ball, bricks;
  let started = false;
  let lost = false;
  let won = false;

  function reset() {
    paddle = { x: (W - PAD_W) / 2, y: H - 12, w: PAD_W, h: PAD_H };
    ball = { x: W / 2, y: paddle.y - BALL_R - 1, dx: 0, dy: 0, r: BALL_R };
    started = false; lost = false; won = false;
    const brickW = (W - (COLS + 1) * BRICK_GAP) / COLS;
    const colors = ['#c54040', '#d4863a', '#d4c43a', '#4aa84a', '#3a78c4'];
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: BRICK_GAP + c * (brickW + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          w: brickW, h: BRICK_H, alive: true,
          color: colors[r % colors.length],
        });
      }
    }
  }

  function launch() {
    if (lost || won) { reset(); return; }
    if (!started) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      ball.dx = SPEED * dir;
      ball.dy = -SPEED;
      started = true;
    }
  }

  function movePaddle(dx) {
    if (!paddle) return;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x + dx));
    if (!started) ball.x = paddle.x + paddle.w / 2;
  }

  function step() {
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, W, H);

    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x, b.y, b.w, 1);
    }

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    if (started) {
      ball.x += ball.dx;
      ball.y += ball.dy;
      if (ball.x < ball.r) { ball.x = ball.r; ball.dx *= -1; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.dx *= -1; }
      if (ball.y < ball.r) { ball.y = ball.r; ball.dy *= -1; }

      if (ball.dy > 0
        && ball.y + ball.r >= paddle.y
        && ball.y - ball.r <= paddle.y + paddle.h
        && ball.x >= paddle.x
        && ball.x <= paddle.x + paddle.w) {
        ball.y = paddle.y - ball.r;
        ball.dy *= -1;
        const hit = (ball.x - paddle.x) / paddle.w - 0.5;
        ball.dx = hit * SPEED * 2.4;
      }

      for (const b of bricks) {
        if (!b.alive) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w
          && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
          b.alive = false;
          const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
          const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
          if (overlapX < overlapY) ball.dx *= -1;
          else ball.dy *= -1;
          break;
        }
      }

      if (ball.y > H + 10) { lost = true; started = false; }
      if (bricks.every(b => !b.alive)) { won = true; started = false; }
    }

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    if (lost || won) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, H / 2 - 18, W, 36);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillText(won ? 'You Win!' : 'Game Over', W / 2, H / 2 - 2);
      ctx.font = '8px -apple-system, sans-serif';
      ctx.fillText('Center to restart', W / 2, H / 2 + 10);
    } else if (!started) {
      ctx.fillStyle = '#666';
      ctx.font = '9px -apple-system, sans-serif';
      ctx.fillText('Wheel: paddle', W / 2, H / 2 + 4);
      ctx.fillText('Center: launch', W / 2, H / 2 + 16);
    }

    raf = requestAnimationFrame(step);
  }

  function start(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    reset();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  return { start, stop, launch, movePaddle, W, H };
})();

window.Brick = Brick;
