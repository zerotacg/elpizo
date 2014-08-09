import sqltap

from sqlalchemy.sql import Select
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import Executable, ClauseElement, \
                                      _literal_as_text
from tornado.web import RequestHandler

from .net import Protocol


class explain(Executable, ClauseElement):
  def __init__(self, stmt, analyze=False):
    self.statement = _literal_as_text(stmt)
    self.analyze = analyze


@compiles(explain)
def pg_explain(element, compiler, **kw):
  text = "EXPLAIN "
  if element.analyze:
    text += "ANALYZE "
  text += compiler.process(element.statement)
  return text


class SQLTapDebugHandler(RequestHandler):
  def get(self):
    clear = self.get_argument("clear", "no clear") != "no clear"

    stats = list(self.application._sqltap_stats)
    if clear:
      self.application._sqltap_stats.clear()

    engine = self.application.sqla_factory.bind

    query_plans = {}

    self.application._sqltap_profiler.stop()
    for stat in stats:
      if isinstance(stat.text, Select):
        k = str(stat.text)
        if k not in query_plans:
          _, clause, multiparams, params, results = stat.user_context
          result = engine.execute(explain(stat.text, analyze=True),
                                  *multiparams, **params)
          query_plans[k] = [c for c, in result.fetchall()]

        plan = query_plans[k]

        stat.text = """\
{query}

{plan}
""".format(query=stat.text, plan="\n".join(["-- " + line for line in plan]))
    self.application._sqltap_profiler.start()

    self.finish(sqltap.report(stats))


def install(application, routes):
  routes.extend([
    (r"/_debug/sql", SQLTapDebugHandler),
  ])

  application._sqltap_stats = []
  application._sqltap_profiler = sqltap.start(
      user_context_fn=lambda *args: tuple(args),
      collect_fn=application._sqltap_stats.append)
