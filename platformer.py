#!/usr/bin/env python3
"""
Terminal Platformer
Controls: A/D or LEFT/RIGHT to move, SPACE or W/UP to jump, Q to quit
"""

import curses
import time
import sys

# ── Physics ──────────────────────────────────────────────────────────────────
GRAVITY       = 0.45
JUMP_POWER    = -7.0
PLAYER_SPEED  = 1
ENEMY_SPEED   = 0.4
FPS           = 30
FRAME_TIME    = 1.0 / FPS

# ── Level layout ─────────────────────────────────────────────────────────────
# Each platform: (col, row, width)
PLATFORMS = [
    (0,  22, 80),   # ground
    (5,  18,  8),
    (18, 15, 10),
    (32, 17,  8),
    (44, 14, 12),
    (58, 18,  8),
    (66, 15,  8),
    (10, 11, 10),
    (28, 12,  8),
    (48, 10, 10),
    (62, 11,  8),
    (20,  7, 12),
    (40,  7, 10),
    (30,  3, 20),   # top / goal platform
]

# Coins: (col, row)
COINS = [
    (8, 17), (10, 17), (12, 17),
    (20, 14), (22, 14), (24, 14), (26, 14),
    (34, 16), (36, 16),
    (46, 13), (48, 13), (50, 13), (52, 13),
    (60, 17), (62, 17),
    (68, 14), (70, 14), (72, 14),
    (12, 10), (14, 10), (16, 10),
    (30, 11), (32, 11),
    (50,  9), (52,  9), (54,  9), (56,  9),
    (64, 10), (66, 10),
    (22,  6), (24,  6), (26,  6), (28,  6),
    (42,  6), (44,  6), (46,  6),
    (35,  2), (37,  2), (39,  2), (41,  2), (43,  2), (45,  2),
]

# Enemies: (col, row, patrol_left, patrol_right)
ENEMIES = [
    (6,  21, 1,  12),
    (20, 14, 19, 26),
    (45, 13, 45, 54),
    (59, 17, 59, 64),
    (67, 14, 67, 72),
    (11, 10, 11, 18),
    (29, 11, 29, 34),
    (49,  9, 49, 57),
    (22,  6, 21, 29),
    (42,  6, 41, 48),
]

GOAL_COL, GOAL_ROW = 39, 2


class Player:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
        self.vx: float = 0.0
        self.vy: float = 0.0
        self.on_ground = False
        self.lives = 3
        self.score = 0
        self.invincible = 0.0   # seconds of invincibility after hit
        self.facing = 1         # 1=right, -1=left
        self.char = '►'

    @property
    def col(self) -> int:
        return int(self.x)

    @property
    def row(self) -> int:
        return int(self.y)

    def respawn(self):
        self.x, self.y = 2.0, 21.0
        self.vx, self.vy = 0.0, 0.0
        self.invincible = 2.0

    @property
    def sprite(self) -> str:
        return '►' if self.facing >= 0 else '◄'


class Enemy:
    def __init__(self, x, row, left, right):
        self.x: float = float(x)
        self.row = row
        self.left = left
        self.right = right
        self.vx: float = ENEMY_SPEED
        self.alive = True

    @property
    def col(self) -> int:
        return int(self.x)

    def update(self, dt: float):
        self.x += self.vx * dt * FPS
        if self.x <= self.left:
            self.x = self.left
            self.vx = ENEMY_SPEED
        elif self.x >= self.right:
            self.x = self.right
            self.vx = -ENEMY_SPEED


def platform_at(col: int, row: int) -> bool:
    for (pc, pr, pw) in PLATFORMS:
        if pr == row and pc <= col < pc + pw:
            return True
    return False


def resolve_platform_collision(player: Player):
    """Land player on top of a platform when falling through it."""
    col = player.col
    row = player.row

    if player.vy >= 0:
        # falling — check one cell below feet
        if platform_at(col, row + 1):
            player.y = float(row)
            player.vy = 0.0
            player.on_ground = True
            return
        # also catch if we passed through (fast fall)
        if platform_at(col, row):
            player.y = float(row - 1)
            player.vy = 0.0
            player.on_ground = True
            return
    else:
        # rising — bump head on platform above
        if platform_at(col, row - 1):
            player.vy = 0.5


def update_player(player: Player, keys: set, dt: float, coins: set, enemies: list, won: list):
    # horizontal
    moving = False
    if 'left' in keys:
        player.x -= PLAYER_SPEED * dt * FPS
        player.facing = -1
        moving = True
    if 'right' in keys:
        player.x += PLAYER_SPEED * dt * FPS
        player.facing = 1
        moving = True
    player.x = max(0.0, min(player.x, 78.0))

    # jump
    if 'jump' in keys and player.on_ground:
        player.vy = JUMP_POWER
        player.on_ground = False

    # gravity
    player.vy += GRAVITY
    player.y += player.vy * dt * FPS
    player.y = max(0.0, player.y)

    player.on_ground = False
    resolve_platform_collision(player)

    # fall off bottom
    if player.row >= 24:
        player.lives -= 1
        player.respawn()
        return

    # collect coins
    pos = (player.col, player.row)
    if pos in coins:
        coins.discard(pos)
        player.score += 10

    # goal
    if player.col == GOAL_COL and player.row == GOAL_ROW:
        won.append(True)

    # enemy collision
    if player.invincible > 0:
        player.invincible -= dt
        return
    for e in enemies:
        if not e.alive:
            continue
        if abs(e.col - player.col) <= 1 and e.row == player.row:
            # stomp from above?
            if player.vy > 0 and player.row <= e.row:
                e.alive = False
                player.vy = JUMP_POWER * 0.6
                player.score += 50
            else:
                player.lives -= 1
                player.respawn()
                return


def draw_frame(stdscr, player: Player, coins: set, enemies: list, won: list, game_over: bool):
    stdscr.erase()
    h, w = stdscr.getmaxyx()

    # platforms
    for (pc, pr, pw) in PLATFORMS:
        for c in range(pc, pc + pw):
            if 0 <= pr < h and 0 <= c < w - 1:
                stdscr.addch(pr, c, '═', curses.color_pair(3))

    # coins
    for (cc, cr) in coins:
        if 0 <= cr < h and 0 <= cc < w - 1:
            stdscr.addch(cr, cc, '●', curses.color_pair(4))

    # goal flag
    if 0 <= GOAL_ROW < h and 0 <= GOAL_COL < w - 1:
        stdscr.addch(GOAL_ROW, GOAL_COL, '⚑', curses.color_pair(5))

    # enemies
    for e in enemies:
        if e.alive and 0 <= e.row < h and 0 <= e.col < w - 1:
            stdscr.addch(e.row, e.col, 'ツ', curses.color_pair(2))

    # player
    pr, pc = player.row, player.col
    if 0 <= pr < h and 0 <= pc < w - 1:
        attr = curses.color_pair(1)
        if player.invincible > 0 and int(player.invincible * 10) % 2 == 0:
            attr |= curses.A_DIM
        stdscr.addch(pr, pc, player.sprite, attr)

    # HUD
    hearts = '♥ ' * player.lives + '♡ ' * (3 - player.lives)
    hud = f" Score: {player.score:04d}  Lives: {hearts} "
    if 0 < w:
        stdscr.addstr(0, 0, hud[:w - 1], curses.color_pair(6) | curses.A_BOLD)

    controls = " A/D=move  SPACE=jump  Q=quit "
    if len(controls) < w:
        stdscr.addstr(h - 1, 0, controls[:w - 1], curses.color_pair(6))

    if won:
        msg = f"  ★ YOU WIN!  Score: {player.score}  Press Q to exit ★  "
        col = max(0, w // 2 - len(msg) // 2)
        stdscr.addstr(h // 2, col, msg, curses.color_pair(5) | curses.A_BOLD)

    if game_over:
        msg = "  ✖ GAME OVER  Press Q to exit ✖  "
        col = max(0, w // 2 - len(msg) // 2)
        stdscr.addstr(h // 2, col, msg, curses.color_pair(2) | curses.A_BOLD)

    stdscr.refresh()


def main(stdscr):
    curses.curs_set(0)
    stdscr.nodelay(True)
    stdscr.keypad(True)

    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(1, curses.COLOR_CYAN,    -1)   # player
    curses.init_pair(2, curses.COLOR_RED,     -1)   # enemies
    curses.init_pair(3, curses.COLOR_GREEN,   -1)   # platforms
    curses.init_pair(4, curses.COLOR_YELLOW,  -1)   # coins
    curses.init_pair(5, curses.COLOR_MAGENTA, -1)   # goal / win
    curses.init_pair(6, curses.COLOR_WHITE,   -1)   # HUD

    h, w = stdscr.getmaxyx()
    if h < 25 or w < 80:
        curses.endwin()
        print(f"Terminal too small. Need at least 80×25, got {w}×{h}.")
        sys.exit(1)

    player  = Player(2.0, 21.0)
    coins   = set(COINS)
    enemies = [Enemy(c, r, l, rt) for (c, r, l, rt) in ENEMIES]
    won     = []

    keys: set = set()
    last     = time.monotonic()

    while True:
        now = time.monotonic()
        dt  = now - last
        last = now
        if dt > 0.1:
            dt = 0.1

        # input
        keys.clear()
        while True:
            ch = stdscr.getch()
            if ch == -1:
                break
            if ch in (ord('q'), ord('Q')):
                return
            if ch in (ord('a'), ord('A'), curses.KEY_LEFT):
                keys.add('left')
            if ch in (ord('d'), ord('D'), curses.KEY_RIGHT):
                keys.add('right')
            if ch in (ord('w'), ord('W'), ord(' '), curses.KEY_UP):
                keys.add('jump')

        game_over = player.lives <= 0

        if not game_over and not won:
            for e in enemies:
                e.update(dt)
            update_player(player, keys, dt, coins, enemies, won)

        draw_frame(stdscr, player, coins, enemies, won, game_over)

        elapsed = time.monotonic() - now
        sleep   = FRAME_TIME - elapsed
        if sleep > 0:
            time.sleep(sleep)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        pass
