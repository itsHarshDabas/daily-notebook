# Regenerates the ER diagram from the table definitions below (kept in sync with supabase/migrations by hand).
# Usage: python3 docs/er-diagram/generate.py docs/er-diagram
import sys, os
from xml.sax.saxutils import escape
def q(s): return escape(str(s), {'"': '&quot;'})

W, HDR, ROW = 320, 32, 24
KW, NW = 48, 160; TW = W - KW - NW
X = {'L2': 40, 'L1': 420, 'C': 800, 'R1': 1180, 'R2': 1560}
TOP = 100

STY = {
  'auth':    ('#E8E8E8', '#666666', '#F7F7F7'),
  'public':  ('#DAE8FC', '#6C8EBF', '#FFFFFF'),
  'storage': ('#D5E8D4', '#82B366', '#FFFFFF'),
}

tables = {}  # id -> dict
def table(tid, title, col, y, kind, rows):
    tables[tid] = dict(id=tid, title=title, x=X[col], y=y, kind=kind, rows=rows,
                       h=HDR + ROW * len(rows))

table('users', 'auth.users  (Supabase Auth)', 'C', 0, 'auth', [
  ('PK', 'id', 'uuid'), ('', 'email', 'text'), ('', 'created_at', 'timestamptz')])
table('profiles', 'profiles', 'L1', TOP, 'public', [
  ('PK, FK', 'id', 'uuid'), ('', 'name', 'text'), ('', 'gender', 'gender'),
  ('', 'period_tracking_hidden', 'boolean'), ('', 'timezone', 'text'), ('', 'currency', 'text'),
  ('', 'avatar_path', 'text'), ('', 'created_at', 'timestamptz'), ('', 'updated_at', 'timestamptz')])
table('storage', "storage.objects  (bucket: avatars)", 'L1', 0, 'storage', [
  ('PK', 'id', 'uuid'), ('', 'bucket_id', "text = 'avatars'"), ('', 'name', 'text  <uid>/<file>')])
table('targets', 'targets', 'L1', 0, 'public', [
  ('PK, FK', 'user_id', 'uuid'), ('', 'calories', 'integer'), ('', 'water_ml', 'integer'),
  ('', 'sleep_hours', 'numeric(3,1)'), ('', 'exercise_min_week', 'integer'),
  ('', 'budget_month', 'numeric(12,2)'), ('', 'updated_at', 'timestamptz')])
table('days', 'days', 'L2', TOP, 'public', [
  ('PK, FK', 'user_id', 'uuid'), ('PK', 'date', 'date'), ('', 'mood_score', 'smallint (1-5)'),
  ('', 'stress', 'smallint (1-5)'), ('', 'calories_total', 'integer'), ('', 'water_ml', 'integer'),
  ('', 'sleep_bed', 'time'), ('', 'sleep_wake', 'time'), ('', 'sleep_hours', 'numeric(3,1)'),
  ('', 'sleep_quality', 'smallint (1-5)'), ('', 'period_flow', 'period_flow'),
  ('', 'period_symptoms', 'text[]'), ('', 'updated_at', 'timestamptz')])
table('notes', 'notes', 'L2', 0, 'public', [
  ('PK, FK', 'user_id', 'uuid'), ('PK', 'date', 'date'), ('PK', 'kind', 'note_kind'),
  ('', 'text', 'text (1-2000 chars)'), ('', 'updated_at', 'timestamptz')])
table('exercises', 'exercises', 'R1', TOP, 'public', [
  ('PK', 'id', 'uuid'), ('FK', 'user_id', 'uuid'), ('', 'date', 'date'), ('', 'type', 'text'),
  ('', 'minutes', 'integer'), ('', 'updated_at', 'timestamptz')])
table('meals', 'meals', 'R1', 0, 'public', [
  ('PK', 'id', 'uuid'), ('FK', 'user_id', 'uuid'), ('', 'date', 'date'), ('', 'meal', 'meal_kind'),
  ('', 'food_name', 'text'), ('', 'calories', 'integer'), ('', 'food_barcode', 'text'),
  ('', 'updated_at', 'timestamptz')])
table('expenses', 'expenses', 'R1', 0, 'public', [
  ('PK', 'id', 'uuid'), ('FK', 'user_id', 'uuid'), ('', 'date', 'date'),
  ('', 'amount', 'numeric(12,2)'), ('', 'category', 'text'), ('', 'note', 'text'),
  ('', 'updated_at', 'timestamptz')])
table('goals', 'monthly_goals', 'R2', TOP, 'public', [
  ('PK', 'id', 'uuid'), ('FK, UQ1', 'user_id', 'uuid'), ('UQ1', 'month', "char(7) 'YYYY-MM'"),
  ('', 'title', 'text'), ('', 'unit', 'text'), ('', 'target', 'numeric(12,2)'),
  ('', 'updated_at', 'timestamptz')])
table('progress', 'goal_progress', 'R2', 0, 'public', [
  ('PK', 'id', 'uuid'), ('FK', 'goal_id', 'uuid'), ('FK', 'user_id', 'uuid'), ('', 'date', 'date'),
  ('', 'amount', 'numeric(12,2)'), ('', 'updated_at', 'timestamptz')])
table('cycles', 'cycles', 'R2', 0, 'public', [
  ('PK', 'id', 'uuid'), ('FK, UQ1', 'user_id', 'uuid'), ('UQ1', 'start_date', 'date'),
  ('', 'end_date', 'date'), ('', 'updated_at', 'timestamptz')])

def below(tid, prev, gap):
    tables[tid]['y'] = tables[prev]['y'] + tables[prev]['h'] + gap

# trunk: the y where every user_id edge meets auth.users.id
TRUNK = 620
T = tables
T['users']['y'] = TRUNK - HDR - ROW // 2
below('storage', 'profiles', 40)                 # profiles 100..348, storage 388..508
T['targets']['y'] = TRUNK + 60                   # gap around the trunk in L1
below('notes', 'days', 50)
T['meals']['y'] = T['exercises']['y'] + T['exercises']['h'] + 40
T['expenses']['y'] = TRUNK + 60
below('progress', 'goals', 50)
below('cycles', 'progress', 50)
assert T['meals']['y'] + T['meals']['h'] < TRUNK - 20, T['meals']
assert T['storage']['y'] + T['storage']['h'] < TRUNK - 20

def row_y(tid, name):
    t = T[tid]
    i = [r[1] for r in t['rows']].index(name)
    return t['y'] + HDR + ROW * i + ROW / 2

def rid(tid, name): return f'{tid}-{name}'

# edges: (src table, src col, tgt table, tgt col, src marker, tgt marker, waypoint x list, side, dashed, label)
UID = ('users', 'id')
CH = {'L2': 375, 'L1': 770, 'R1': 1150, 'R2': 1530}
edges = []
def to_users(tid, col, chan, card='many'):
    side = 'right' if chan in ('L2', 'L1') else 'left'
    edges.append(dict(s=(tid, col), t=UID, sm='one' if card == 'one' else 'many', tm='one',
                      xs=[CH[chan]], side=side, tside='left' if side == 'right' else 'right'))
to_users('profiles', 'id', 'L1', 'one')
to_users('targets', 'user_id', 'L1', 'one')
to_users('days', 'user_id', 'L2')
to_users('notes', 'user_id', 'L2')
to_users('exercises', 'user_id', 'R1')
to_users('meals', 'user_id', 'R1')
to_users('expenses', 'user_id', 'R1')
to_users('goals', 'user_id', 'R2')
to_users('progress', 'user_id', 'R2')
to_users('cycles', 'user_id', 'R2')
edges.append(dict(s=('progress', 'goal_id'), t=('goals', 'id'), sm='many', tm='one',
                  xs=[X['R2'] + W + 30], side='right', tside='right'))
edges.append(dict(s=('profiles', 'avatar_path'), t=('storage', 'name'), sm='zone', tm='zone',
                  xs=[X['L1'] - 18], side='left', tside='left', dashed=True))

def path(e):
    (st, sc), (tt, tc) = e['s'], e['t']
    sx = T[st]['x'] + (W if e['side'] == 'right' else 0)
    tx = T[tt]['x'] + (W if e['tside'] == 'right' else 0)
    sy, ty = row_y(st, sc), row_y(tt, tc)
    cx = e['xs'][0]
    return [(sx, sy), (cx, sy), (cx, ty), (tx, ty)]

# ---------------- draw.io ----------------
cells = []
def cell(id, value, style, parent, geo, vertex=True, extra=''):
    cells.append(f'<mxCell id="{q(id)}" value="{q(value)}" style="{q(style)}" '
                 f'{"vertex" if vertex else "edge"}="1" parent="{q(parent)}"{extra}>{geo}</mxCell>')

FONT = 'fontFamily=Helvetica;fontSize=12;'
cell('title', 'Daily Notebook - Database ER Diagram (Supabase Postgres)',
     'text;fontSize=22;fontStyle=1;align=left;verticalAlign=middle;' + 'fontFamily=Helvetica;', '1',
     '<mxGeometry x="40" y="20" width="900" height="40" as="geometry"/>')
cell('subtitle', 'Generated from supabase/migrations on main, 2026-10-22',
     'text;fontSize=13;fontColor=#666666;align=left;verticalAlign=middle;fontFamily=Helvetica;', '1',
     '<mxGeometry x="40" y="56" width="900" height="24" as="geometry"/>')

for t in T.values():
    fill, stroke, body = STY[t['kind']]
    cell(t['id'], t['title'],
         f'shape=table;startSize={HDR};container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;'
         f'rowLines=1;fontStyle=1;align=center;resizeLast=1;fillColor={fill};strokeColor={stroke};'
         f'swimlaneFillColor={body};rounded=1;arcSize=4;' + FONT + 'fontSize=13;', '1',
         f'<mxGeometry x="{t["x"]}" y="{t["y"]}" width="{W}" height="{t["h"]}" as="geometry"/>')
    for i, (k, n, ty) in enumerate(t['rows']):
        r = rid(t['id'], n)
        cell(r, '', 'shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;'
             'collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
             f'top=0;left=0;right=0;bottom=0;strokeColor={stroke};', t['id'],
             f'<mxGeometry y="{HDR + ROW * i}" width="{W}" height="{ROW}" as="geometry"/>')
        bold = 'fontStyle=1;' if 'PK' in k else ''
        under = 'fontStyle=5;' if k.startswith('PK') else ('fontStyle=2;' if k.startswith('FK') else '')
        for j, (val, x0, w, st) in enumerate([(k, 0, KW, 'align=center;fontStyle=1;fontSize=10;fontColor=#555555;'),
                                              (n, KW, NW, 'align=left;spacingLeft=6;' + under),
                                              (ty, KW + NW, TW, 'align=left;spacingLeft=6;fontColor=#555555;')]):
            cell(f'{r}-{j}', val, 'shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;'
                 f'right=0;overflow=hidden;whiteSpace=wrap;{FONT}{st}', r,
                 f'<mxGeometry x="{x0}" width="{w}" height="{ROW}" as="geometry">'
                 f'<mxRectangle width="{w}" height="{ROW}" as="alternateBounds"/></mxGeometry>')

MK = {'one': 'ERmandOne', 'many': 'ERzeroToMany', 'zone': 'ERzeroToOne'}
for i, e in enumerate(edges):
    pts = path(e)
    ex = 1 if e['side'] == 'right' else 0
    en = 1 if e['tside'] == 'right' else 0
    style = (f'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow={MK[e["tm"]]};startArrow={MK[e["sm"]]};'
             f'endFill=0;startFill=0;endSize=10;startSize=10;strokeColor=#4D4D4D;strokeWidth=1.3;'
             f'exitX={ex};exitY=0.5;exitDx=0;exitDy=0;entryX={en};entryY=0.5;entryDx=0;entryDy=0;'
             + ('dashed=1;' if e.get('dashed') else ''))
    wp = ''.join(f'<mxPoint x="{x}" y="{y}"/>' for x, y in pts[1:-1])
    cell(f'e{i}', '', style, '1', f'<mxGeometry relative="1" as="geometry"><Array as="points">{wp}</Array></mxGeometry>',
         vertex=False, extra=f' source="{rid(*e["s"])}" target="{rid(*e["t"])}"')

# legend + enums under auth.users in the centre column
LEG_Y = 100
legend = [
  'Legend',
  'PK  primary key  (underlined)',
  'FK  foreign key  (italic)',
  'UQ1  columns of one unique constraint',
  '|| ---- O<   one user : zero or many rows',
  '|| ---- ||   one user : exactly one row',
  '- - - - -   logical link (path, not an FK)',
  '',
  'Every FK to auth.users is ON DELETE CASCADE.',
  'goal_progress.goal_id is ON DELETE CASCADE.',
  'RLS on every public table: a user can only',
  'read and write rows where user_id = auth.uid().',
  'Avatars live at avatars/<uid>/<file>; storage',
  'policies limit each user to their own folder.',
  'Signup trigger creates profiles + targets rows.',
]
LEG_H = 22 * len(legend) + 16
ENUM_Y = TRUNK + 120
enums = [('gender', "female | male | other | prefer_not_to_say"),
         ('meal_kind', 'breakfast | lunch | dinner | snack'),
         ('period_flow', 'light | medium | heavy'),
         ('note_kind', 'mood | period | goal')]
ENUM_H = HDR + ROW * 2 * len(enums)

cell('legend', '\n'.join(legend), 'rounded=1;arcSize=3;whiteSpace=wrap;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;'
     'fillColor=#FFFFFF;strokeColor=#B3B3B3;' + FONT + 'fontSize=12;', '1',
     f'<mxGeometry x="{X["C"]}" y="{LEG_Y}" width="{W}" height="{LEG_H}" as="geometry"/>')
assert LEG_Y + LEG_H < T['users']['y'] - 20, (LEG_Y + LEG_H, T['users']['y'])
cell('enums', 'Enum types (public)', f'shape=table;startSize={HDR};container=1;collapsible=0;childLayout=tableLayout;'
     'fixedRows=1;rowLines=0;fontStyle=1;align=center;fillColor=#FFF2CC;strokeColor=#D6B656;rounded=1;arcSize=4;'
     + FONT + 'fontSize=13;', '1', f'<mxGeometry x="{X["C"]}" y="{ENUM_Y}" width="{W}" height="{ENUM_H}" as="geometry"/>')
for i, (n, v) in enumerate(enums):
    for j, (val, st) in enumerate([(n, 'fontStyle=1;'), (v, 'fontColor=#555555;')]):
        cell(f'enum-{n}-{j}', val, 'text;align=left;verticalAlign=middle;spacingLeft=12;' + FONT + st, 'enums',
             f'<mxGeometry y="{HDR + ROW * (2 * i + j)}" width="{W}" height="{ROW}" as="geometry"/>')

xml = ('<mxfile host="app.diagrams.net"><diagram id="er" name="ER diagram">'
       '<mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" '
       'fold="1" page="1" pageScale="1" pageWidth="1980" pageHeight="1200" background="#FFFFFF" math="0" shadow="0">'
       '<root><mxCell id="0"/><mxCell id="1" parent="0"/>' + ''.join(cells) +
       '</root></mxGraphModel></diagram></mxfile>\n')

# ---------------- SVG preview (same geometry) ----------------
CW = X['R2'] + W + 80
CH_ = max(t['y'] + t['h'] for t in T.values()) + 60
CH_ = max(CH_, ENUM_Y + ENUM_H + 60)
s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{CW}" height="{CH_}" viewBox="0 0 {CW} {CH_}" '
     'font-family="Helvetica, Arial, sans-serif">',
     f'<rect width="{CW}" height="{CH_}" fill="#FFFFFF"/>',
     '<text x="40" y="48" font-size="22" font-weight="bold" fill="#1A1A1A">Daily Notebook - Database ER Diagram (Supabase Postgres)</text>',
     '<text x="40" y="74" font-size="13" fill="#666666">Generated from supabase/migrations on main, 2026-10-22</text>']

def marker(x, y, d, kind):
    # d = +1 if the line leaves the table to the right, -1 to the left; (x,y) is on the table edge
    o = []
    ln = lambda x1, y1, x2, y2: o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#4D4D4D" stroke-width="1.3"/>')
    circ = lambda cx: o.append(f'<circle cx="{cx}" cy="{y}" r="4.5" fill="#FFFFFF" stroke="#4D4D4D" stroke-width="1.3"/>')
    if kind == 'one':
        ln(x + d * 8, y - 7, x + d * 8, y + 7); ln(x + d * 13, y - 7, x + d * 13, y + 7)
    elif kind == 'many':
        ln(x, y - 7, x + d * 10, y); ln(x, y + 7, x + d * 10, y); ln(x + d * 10, y - 7, x + d * 10, y + 7); circ(x + d * 19)
    elif kind == 'zone':
        ln(x + d * 8, y - 7, x + d * 8, y + 7); circ(x + d * 17)
    return o

edge_svg, mark_svg = [], []
for e in edges:
    pts = path(e)
    dash = ' stroke-dasharray="6 4"' if e.get('dashed') else ''
    edge_svg.append(f'<polyline points="{" ".join(f"{x},{y}" for x, y in pts)}" fill="none" stroke="#4D4D4D" '
                    f'stroke-width="1.3" stroke-linejoin="round"{dash}/>')
    mark_svg += marker(*pts[0], 1 if e['side'] == 'right' else -1, e['sm'])
    mark_svg += marker(*pts[-1], 1 if e['tside'] == 'right' else -1, e['tm'])
s += edge_svg

def box(x, y, h, title, fill, stroke, body):
    return [f'<rect x="{x}" y="{y}" width="{W}" height="{h}" rx="5" fill="{body}" stroke="{stroke}" stroke-width="1.2"/>',
            f'<path d="M{x} {y + HDR} V{y + 5} a5 5 0 0 1 5 -5 H{x + W - 5} a5 5 0 0 1 5 5 V{y + HDR} Z" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>',
            f'<text x="{x + W / 2}" y="{y + 21}" font-size="13" font-weight="bold" text-anchor="middle" fill="#1A1A1A">{q(title)}</text>']

for t in T.values():
    fill, stroke, body = STY[t['kind']]
    x, y = t['x'], t['y']
    s += box(x, y, t['h'], t['title'], fill, stroke, body)
    for i, (k, n, ty) in enumerate(t['rows']):
        ry = y + HDR + ROW * i
        if i: s.append(f'<line x1="{x}" y1="{ry}" x2="{x + W}" y2="{ry}" stroke="{stroke}" stroke-opacity="0.35"/>')
        s.append(f'<text x="{x + KW / 2}" y="{ry + 16}" font-size="10" font-weight="bold" text-anchor="middle" fill="#555555">{q(k)}</text>')
        deco = ' text-decoration="underline" font-weight="bold"' if k.startswith('PK') else (' font-style="italic"' if k.startswith('FK') else '')
        s.append(f'<text x="{x + KW + 6}" y="{ry + 16}" font-size="12" fill="#1A1A1A"{deco}>{q(n)}</text>')
        s.append(f'<text x="{x + KW + NW + 6}" y="{ry + 16}" font-size="12" fill="#555555">{q(ty)}</text>')
s += mark_svg

x = X['C']
s.append(f'<rect x="{x}" y="{LEG_Y}" width="{W}" height="{LEG_H}" rx="5" fill="#FFFFFF" stroke="#B3B3B3"/>')
for i, line in enumerate(legend):
    s.append(f'<text x="{x + 12}" y="{LEG_Y + 24 + 22 * i}" font-size="12" fill="#1A1A1A"{" font-weight=\"bold\"" if i == 0 else ""}>{q(line)}</text>')
s += box(x, ENUM_Y, ENUM_H, 'Enum types (public)', '#FFF2CC', '#D6B656', '#FFFFFF')
for i, (n, v) in enumerate(enums):
    s.append(f'<text x="{x + 12}" y="{ENUM_Y + HDR + ROW * 2 * i + 16}" font-size="12" font-weight="bold" fill="#1A1A1A">{q(n)}</text>')
    s.append(f'<text x="{x + 12}" y="{ENUM_Y + HDR + ROW * (2 * i + 1) + 16}" font-size="12" fill="#555555">{q(v)}</text>')
s.append('</svg>\n')

out = sys.argv[1]
open(os.path.join(out, 'daily-notebook-er.drawio'), 'w').write(xml)
open(os.path.join(out, 'daily-notebook-er.svg'), 'w').write('\n'.join(s))
print('ok', CW, CH_)
