import json
import math
import sqlparse
from io import StringIO

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import Executable, ClauseElement, \
                                      _literal_as_text


EXCLUDED_NODE_FIELDS = {"Plan Width", "Plan Rows", "Plans", "Node Type",
                        "Parent Relationship", "Subplan Name"}
SQL_FIELDS = {"Index Cond", "Recheck Cond", "Join Filter", "Filter"}
INDENT = "  "

def reindent_cond(expr):
  expr, = sqlparse.parse(expr)[0].tokens
  buf = []
  indent_level = 0
  new_level = False

  for token in expr.flatten():
    if token.ttype is sqlparse.tokens.Token.Punctuation:
      if token.value == "(":
        indent_level += 1
        buf.append("(\n" + (INDENT * indent_level))
        new_level = True
        continue
      elif token.value == ")":
        indent_level -= 1
        buf.append("\n" + (INDENT * indent_level) + ")")
        continue
      elif token.value == ",":
        buf.append(",\n" + (INDENT * indent_level))
        new_level = True
        continue
    if new_level and token.ttype is sqlparse.tokens.Token.Text.Whitespace:
      continue
    token = str(token)
    new_level = False
    buf.append(token)

  return "".join(buf)


def format_field(key, value):
  if key in SQL_FIELDS:
    value = reindent_cond(value)

  value = str(value) \
      .replace("&", "&amp;") \
      .replace(" ", "&nbsp;") \
      .replace("<", "&lt;") \
      .replace(">", "&gt;") \
      .replace("\n", "<BR />")

  return """\
<TR>
  <TD ALIGN="left" BALIGN="left" VALIGN="top"><B>{key}</B></TD>
  <TD ALIGN="left" BALIGN="left" VALIGN="top">{value}</TD>
</TR>""".format(
        key=key,
        value=value)


def format_node(node):
  return """\
<TABLE PORT="here" BORDER="1" CELLBORDER="0" CELLSPACING="0">
  <TR><TD COLSPAN="2"><B>{title}</B></TD></TR>
{body}
</TABLE>
""".format(
      title=node["Node Type"],
      body="\n".join(format_field(key, value)
            for key, value in sorted(node.items())
            if key not in EXCLUDED_NODE_FIELDS))


def format_edge(node):
  return """\
<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0">
  <TR><TD COLSPAN="2"><B>{title}</B></TD></TR>
{body}
</TABLE>""".format(
      title=node["Parent Relationship"],
      body="\n".join(format_field(key, value)
          for key, value in sorted(node.items())
          if key in {"Plan Width", "Plan Rows"}))


def format_subplan(node):
  return """\
<B>{title}</B>
""".format(title=node["Subplan Name"])


def draw_node(node, f, id="root", parent_id=None):
  f.write("{id} [label=<{text}>];\n".format(
      id=id,
      text=format_node(node)))

  if parent_id is not None:
    f.write("{id}:here -> {parent_id}:here [label=<{text}>, penwidth={penwidth}];".format(
        parent_id=parent_id,
        id=id,
        text=format_edge(node),
        penwidth=int(math.log(max(node["Plan Width"], 2), 2))))

  if "Subplan Name" in node:
    f.write("""subgraph cluster_{id} {{ label=<{text}>;""".format(
        id=id,
        text=format_subplan(node)))

  for i, child in enumerate(node.get("Plans", [])):
    draw_node(child, f, "{parent_id}_{i}".format(parent_id=id, i=i), id)

  if "Subplan Name" in node:
    f.write("}\n")


DEFAULT_FONT = "monospace"
FONT_SIZE = 10

def make_explain_graph(plan):
  out = StringIO()
  out.write("""digraph {{
  fontname="{font}";
  fontsize={font_size};

  node [shape=plaintext, fontname="{font}", fontsize={font_size}];
  edge [fontname="{font}", fontsize={font_size}];
  """.format(
      font=DEFAULT_FONT,
      font_size=FONT_SIZE))
  draw_node(plan, out)
  out.write("}\n")

  return out.getvalue()


class ExplainClause(Executable, ClauseElement):
  def __init__(self, stmt):
    self.statement = _literal_as_text(stmt)

  def __getattr__(self, key):
    return getattr(self.statement, key)

@compiles(ExplainClause)
def pg_explain(element, compiler, **kw):
  return "EXPLAIN (FORMAT JSON) " + compiler.process(element.statement)


def explain_query(engine, query, multiparams, params):
  (plan,), = engine.execute(ExplainClause(query), *multiparams, **params) \
      .fetchone()

  return make_explain_graph(plan["Plan"])
