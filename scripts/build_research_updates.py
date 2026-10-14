#!/usr/bin/env python3
"""Build the Sonata/product and CoT/OPD reading pages from reviewed public notes."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'learning'
UPDATED = '2026-10-14'


def read(name):
    return json.loads((PAGE / 'data' / (name + '.json')).read_text())


def esc(value):
    return html.escape(str(value), quote=True)


def p(value, cls=''):
    return f'<p class="{esc(cls)}">{esc(value)}</p>'


def link(url, label):
    extra = ' target="_blank" rel="noopener noreferrer"' if url.startswith('https://') else ''
    return f'<a href="{esc(url)}"{extra}>{esc(label)}</a>'


def items(values):
    return '<ul>' + ''.join('<li>' + esc(x) + '</li>' for x in values) + '</ul>'


def detail(ident, title, body):
    return f'<details class="study-detail" id="{esc(ident)}"><summary>{esc(title)}</summary><div class="detail-body">{body}</div></details>'


def fields(row, mapping):
    out = ''
    for key, title in mapping:
        value = row.get(key)
        if value:
            out += '<h4>' + esc(title) + '</h4>'
            out += items(value) if isinstance(value, list) else p(value)
    return out


def ref_id(value):
    return 'ref-' + value.replace('_', '-')


def refs(ids, sources):
    return '<div class="paper-links">' + ''.join(link('#' + ref_id(i), sources[i]['title']) for i in ids) + '</div>'


def sources_html(rows):
    out = ''
    for row in rows:
        kind = 'official' if row.get('kind') in ('official', 'official_technical_report', 'official_research_report', 'official_documentation') or row.get('vendor') else 'paper'
        out += f'<article class="source-card" data-source-card data-kind="{kind}" id="{esc(ref_id(row["id"]))}"><h3>' + link(row['url'], row['title']) + '</h3>'
        out += p('核验：' + row.get('accessed', UPDATED), 'source-meta')
        for key in ('note', 'supports', 'role'):
            if row.get(key):
                out += p(row[key], 'small')
        if row.get('full_text'):
            out += link(row['full_text'], '核验版本全文')
        out += '</article>'
    return out


def build(template, target, replacements):
    result = (PAGE / template).read_text()
    for key, value in {'UPDATED': UPDATED, **replacements}.items():
        assert '{{' + key + '}}' in result, key
        result = result.replace('{{' + key + '}}', value)
    assert '{{' not in result, target
    (PAGE / target).write_text(result)
    print('Built ' + target)


sonata = read('sonata')
industry = read('industry-products')
open_products = read('open-products')
cot = read('cot-opd')

sonata_html = p(sonata['status'], 'small')
for row in sonata['method']:
    sonata_html += '<h3>' + esc(row['title']) + '</h3>' + p(row['text'])
sonata_html += '<div class="formula">' + esc(sonata['formula']) + '</div>'
sonata_html += p('依据：正式 PDF §3–4、Algorithm 1–2 与实验设置。', 'small') + link('#ref-sonata-pdf', '查看正式论文')

result_html = '<div class="table-wrap"><table><thead><tr><th>Qwen3-8B BF16</th><th>默认 thinking → Sonata</th><th>思考 token</th><th>平均延迟</th></tr></thead><tbody>'
for row in sonata['representative_results']:
    b, s = row['baseline'], row['sonata']
    latency = f'{b["average_latency_seconds"]} → {s["average_latency_seconds"]} 秒' if 'average_latency_seconds' in b else '该任务未单独报告'
    result_html += '<tr><td>' + esc(row['benchmark']) + '</td><td>' + esc(f'{b["accuracy_percent"]}% → {s["accuracy_percent"]}% pass@1') + '</td><td>' + esc(f'{b["average_thinking_tokens"]:,} → {s["average_thinking_tokens"]:,}') + '</td><td>' + esc(latency) + '</td></tr>'
result_html += '</tbody></table></div>'
result_html += p('Tables 1–2：质量实验 temperature=0.6、top-p=0.95；MATH-500 延迟在 1×NVIDIA B200、batch=1、vLLM 下测量。MATH-500 正确率略降；GPQA 上升不代表所有任务都上升。', 'small')
result_html += link('#ref-sonata-pdf', '原始表格与实验条件')

product_sources = sonata['sources'] + industry['sources'] + open_products['sources']
source_map = {x['id']: x for x in product_sources}
products_html = ''
for row in industry['products']:
    body = p('具体范围：' + '；'.join(row['model_versions']), 'small')
    body += fields(row, [('mechanism', '公开行为'), ('controls', '控制接口与预算'), ('known', '需要保留的区别'), ('not_disclosed', '公开证据的边界'), ('what_to_learn', '研究启发（推论）')])
    body += refs(row['source_ids'], source_map)
    products_html += detail('product-' + row['id'], row['vendor'] + ' · ' + row['product'], body)
for row in open_products['products']:
    body = p(row['scope'], 'small') + fields(row, [('controls', '控制接口'), ('budget', '预算语义'), ('mechanism', '公开行为'), ('context', '多轮与工具上下文'), ('unknown', '公开证据的边界'), ('lesson', '研究启发（推论）')])
    body += refs(row['source_ids'], source_map)
    products_html += detail('product-' + row['id'], row['name'], body)

product_rows = [
    ('openai_api', 'OpenAI API', '模型内动态投入 + 外部 effort', 'effort；总输出 cap 另设', '有档位不等于固定 token；训练机制未披露'),
    ('chatgpt_work_codex', 'ChatGPT Work / Codex', '模型、effort 与并行 agent 编排', 'Power / Advanced / Max / Ultra', 'Ultra 不只是加长单条思维链；不外推至 Chat'),
    ('claude', 'Claude API', '按请求选择是否及多深思考，可与工具交错', 'adaptive + effort；max_tokens 兜底', '默认启用 adaptive 不等于每题必有思考块'),
    ('gemini', 'Gemini API', '按复杂度动态投入', 'level；旧 API 的 2.5 budget；总输出 cap', '旧数值 budget 可能超／欠；区分 API 版本'),
    ('deepseek', 'DeepSeek API', '模式开关 + effort 档位', 'thinking / reasoning.effort', '部分别名映射到同一档；自动路由未由此证明'),
    ('qwen', 'Qwen / Model Studio', '支持型号的混合思考与长度控制', 'enable_thinking / thinking_budget', '历史思考保留是独立的上下文控制'),
]
product_table = '<div class="table-wrap"><table><thead><tr><th>产品 / 接口</th><th>公开的控制层</th><th>主要参数</th><th>最易混淆的地方</th></tr></thead><tbody>'
for ident, title, *cells in product_rows:
    product_table += '<tr><td>' + link('#product-' + ident, title) + '</td>' + ''.join('<td>' + esc(c) + '</td>' for c in cells) + '</tr>'
product_table += '</tbody></table></div>'
build('products-template.html', 'adaptive-products.html', {'SONATA': sonata_html, 'RESULTS': result_html, 'PRODUCT_TABLE': product_table, 'PRODUCTS': products_html, 'SOURCES': sources_html(product_sources)})

cot_sources = {x['id']: x for x in cot['sources']}
focus_html = ''
for i, row in enumerate(cot['trends'], 1):
    body = p(row['why_now']) + fields(row, [('question', '可检验的问题'), ('method_proposal', '可尝试的实验（提案）'), ('evidence', '目前证据'), ('limitation', '尚不能下的结论')])
    body += '<div class="note">' + p(row['interview_line']) + '</div>' + refs(row['source_ids'], cot_sources)
    focus_html += detail('trend-' + row['id'], str(i) + ' · ' + row['title'], body)
focus_html += '<div class="note">' + p(cot['conceptual_map']['negative_trajectory_distinctions']) + '</div>'
focus_html += '<h3 id="industrial-training">已有模型的公开训练配方：CoT 与 OPD 怎样配合</h3>'
focus_html += p('以下两项是 2026 年 NVIDIA 官方技术报告，作为 10 项主文献之外的工业实例。它们披露了具体训练流程，但不代表其他公司或同品牌后续型号使用相同配方。', 'small')
for row in cot['industry_reports']:
    body = p(row['title']) + p(row['exact_model'] + ' ｜ ' + row['date'], 'source-meta')
    if row.get('version'):
        body += p(row['version'], 'small')
    body += fields(row, [('verified_recipe', '公开披露的做法'), ('limitations', '适用条件与局限'), ('why_relevant', '对 CoT 数据研究的启发')])
    body += p('定位：' + '；'.join(row['sections']), 'small') + refs([row['id']], cot_sources)
    if row.get('version_url'):
        body += link(row['version_url'], 'arXiv 版本记录')
    focus_html += detail('industry-' + row['id'].lower(), row['exact_model'] + ' · ' + row['date'], body)

paper_html = p('本页 10 项主论文／报告，其中 6 项论文首发于 2026 年；3 项在 8–9 月首发，另有 1 项在 9 月更新版本。检索截至 ' + UPDATED + '，不声称穷尽全部新稿。', 'small')
priority = ['simple_opd', 'tml_opd', 'stopping', 'rl_starts', 'rethinking_opsd', 'guided_opd', 'openthoughts', 'art', 'faithfulness', 'akl']
papers = {x['id']: x for x in cot['papers']}
guide_ids = {'simple_opd': 'simple_opd', 'rl_starts': 'rl-starts-before-rl', 'art': 'art-efficient-reasoning', 'akl': 'adaptive_kl'}
for ident in priority:
    row = papers[ident]
    body = p(row['title']) + p('首次公开：' + row['first_date'] + ' ｜ 核验版本：' + row['version'] + ' · ' + row['version_date'], 'source-meta') + p(row['venue'], 'small')
    body += fields(row, [('question', '研究问题'), ('method', '方法'), ('direct_evidence', '作者报告的证据'), ('limitation', '证据边界'), ('interview_bridge', '怎样转成自己的问题')])
    body += refs(row['source_ids'], cot_sources)
    if ident in guide_ids:
        body += link('papers.html#paper-' + guide_ids[ident], '打开已有完整讲义')
    paper_html += detail('cot-paper-' + ident, row['short_title'], body)

evaluation = detail('evaluation-details', '展开：测评协议与实验记录要点', items(x['item'] + '：' + x['check'] for x in cot['evaluation_checklist']))
pilot = cot['proposed_pilot']
evaluation += detail('compatibility-pilot', '另一个更聚焦的起点：兼容性是否能预测 CoT 数据价值？', p(pilot['status'], 'small') + fields(pilot, [('primary_question', '假设'), ('minimal_design', '第一轮对照'), ('candidate_predictors', '候选指标'), ('falsification', '什么结果会推翻假设'), ('small_budget_priority', '资源有限时的取舍')]))

question_html = ''
for i, row in enumerate(cot['interview_questions'], 1):
    question_html += detail('interview-' + str(i), row['question'], p(row['answer']) + refs(row['evidence_ids'], cot_sources))
question_html += detail('interview-6', '论文还没写完，你已经做了什么？', p('按个人职责回答：已实现的流程、稳定的基线、已完成的对照、得到的观察，以及由此改变的研究决策。把“团队正在研究”“我亲自完成”“下一步计划”分别说清。没有最终提升数字时，用可核验的中间产物说明进展。'))
build('cot-template.html', 'cot-data-opd.html', {'FOCUS': focus_html, 'PAPERS': paper_html, 'EVALUATION': evaluation, 'QUESTIONS': question_html, 'SOURCES': sources_html(cot['sources'])})
