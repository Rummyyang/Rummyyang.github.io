#!/usr/bin/env python3
"""Render the adaptive-thinking literature guide from reviewed source notes."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'learning'
UPDATED = '2026-10-14'


def read(name):
    return json.loads((PAGE / 'data' / f'{name}.json').read_text())


def esc(value):
    return html.escape(str(value), quote=True)


def p(value, cls=''):
    return f'<p class="{esc(cls)}">{esc(value)}</p>'


def link(url, title):
    extra = ' target="_blank" rel="noopener noreferrer"' if url.startswith('https://') else ''
    return f'<a href="{esc(url)}"{extra}>{esc(title)}</a>'


def items(values):
    return '<ul>' + ''.join('<li>' + esc(x) + '</li>' for x in values) + '</ul>'


def detail(title, body, ident):
    return f'<details class="study-detail" id="{esc(ident)}"><summary>{esc(title)}</summary><div class="detail-body">{body}</div></details>'


def paragraph_fields(row, mapping):
    out = ''
    for key, title in mapping:
        value = row.get(key)
        if value:
            out += '<h4>' + esc(title) + '</h4>'
            out += items(value) if isinstance(value, list) else p(value)
    return out


SURVEY_DATA = read('surveys')
SURVEYS = SURVEY_DATA['surveys']
CONFERENCE_DATA = read('conference')
FRONTIER_DATA = read('frontier')


def surveys():
    out = '<div class="note">' + p('先读 Reasoning on a Budget 建立“可控／自适应”概念，再读 From Efficiency to Adaptivity；需要更新全景时，读 2026 年 9 月修订的 Reasoning Economy。') + '</div>'
    for s in sorted(SURVEYS, key=lambda x: x['priority']):
        body = '<div class="evidence"><span class="badge">' + esc(s['scope_type']) + '</span></div>'
        body += p(s['authors_short'], 'small')
        body += p('首次公开：' + s['first_version_date'] + ' ｜ 最新：' + s['latest_version'] + ' · ' + s['latest_version_date'], 'small')
        body += p(s['venue_status'], 'small') + p(s['summary_zh'])
        body += '<h4>建议阅读的章节</h4>' + items('§' + x['section'] + '：' + x['focus'] for x in s['read_sections'])
        body += '<h4>阅读边界</h4>' + items(s['limitations'])
        body += '<div class="paper-links">' + link(s['url'], '版本记录') + link(s['full_text_url'], '核验版本全文')
        if s.get('venue_url'):
            body += link(s['venue_url'], '出版社记录')
        body += '</div>'
        out += detail(s['title'], body, 'survey-' + s['id'])
    s = SURVEY_DATA['additional_recent_context']
    body = p('首次公开／最新版本：' + s['first_version_date'] + ' · ' + s['latest_version'], 'small')
    body += p(s['why_not_core']) + p(s['venue_status'], 'small') + items(s['read_sections']) + link(s['url'], '原论文与版本记录')
    out += detail('拓展 · ' + s['title'], body, 'survey-test-time-intelligence')
    out += p('“最近更新”与“新出现”分别列出；更新日期不是文献覆盖截止日期。综述章节按所链接版本核验。', 'small')
    return out


def method_map():
    rows = [
        ('是否想', '请求级：快答或显式长推理', '模式选择数据、首控制 token、模式成本奖励', 'Thinkless / RPO'),
        ('想多久', '序列或步骤级：继续、压缩或停止', '预算条件 SFT/RL、停止奖励、动态长度惩罚', 'TALE / LEASH / SAT'),
        ('想几条路', '候选级：采样数量、搜索宽度与深度', '搜索控制、候选一致性、收益预测或控制器 RL', 'Compute-optimal TTS / 小型 RL 控制器'),
        ('怎样验证', '步骤级：复查、调用验证器或工具', '过程奖励、工具收益与耗时建模', 'MUR / Timely Machine / 验证器搜索'),
        ('让谁来想', '模型级：小／大模型或外部路由', '预测难度与收益，蒸馏，跨模型校准', 'Router / Cascade（拓展方向）'),
    ]
    out = '<div class="table-wrap"><table><thead><tr><th>计算旋钮</th><th>动作与粒度</th><th>训练／控制思路</th><th>阅读线索</th></tr></thead><tbody>'
    for row in rows:
        out += '<tr>' + ''.join('<td>' + esc(x) + '</td>' for x in row) + '</tr>'
    out += '</tbody></table></div>'
    out += '<div class="note">' + p('对模型后训练岗位，最值得先深挖的是前两行：学会选模式，学会何时停止。再将并行采样、验证器和路由作为强基线；“多条短链”与“一条长链”可能在相同预算下得到不同结果。') + '</div>'
    return out


def conferences():
    papers = CONFERENCE_DATA['papers']
    out = '<div class="table-wrap"><table><thead><tr><th>论文</th><th>正式发表</th><th>主要决策</th></tr></thead><tbody>'
    for row in papers:
        out += '<tr><td>' + link('#paper-' + row['id'], row['short_name']) + '</td><td>' + esc(row['venue']) + '</td><td>' + esc(' / '.join(row['method_axes'])) + '</td></tr>'
    out += '</tbody></table></div>'
    for row in papers:
        body = '<div class="evidence"><span class="badge">' + esc(row['venue']) + '</span><span class="badge secondary">' + esc(row['status']) + '</span></div>'
        body += p(row['title']) + p(row['authors'] + ' ｜ ' + row['publication_date'], 'small')
        body += paragraph_fields(row, [('motivation','动机'),('mechanism','方法')])
        body += '<h4>效果与比较条件</h4>' + p(row['result']['text'])
        if row['result'].get('condition'):
            body += p(row['result']['condition'], 'small')
        body += p('定位：' + row['result']['location'], 'small')
        body += paragraph_fields(row, [('limitations','局限'),('versus_manual_budget','比手动指定预算多了什么'),('reading_question','带着这个问题阅读')])
        body += '<div class="paper-links">' + link(row['official_record_url'], '正式会议记录') + link(row['paper_url'], '论文 PDF') + '</div>'
        out += detail(row['short_name'] + ' · ' + row['motivation'], body, 'paper-' + row['id'])
    out += '<div class="note warm">' + p('同一个 adaptive 标签可以对应不同层次：Thinkless／RPO 学习模式选择；MUR 在不确定步骤增加计算；SAT 在步骤间切模式；LEASH 自适应调训练惩罚。它们并不都实现逐题自动预算，也不能直接按 token 降幅排名。') + '</div>'
    return out


def reading_order():
    steps = [
        ('建立定义', '先读两篇精准综述的定义与分类；用一页图区分可控预算、自适应选择、串行长度与并行宽度。', '#survey-budget_survey', 'Reasoning on a Budget'),
        ('学会选模式', '精读 Thinkless 和 RPO。画出模式 token 与响应 token 的损失，解释为什么两者梯度可能失衡。', '#conferences', '正式会议论文'),
        ('学会停止与分配长度', '读 LEASH、MUR，再看 2026 年新稿；比较固定惩罚、动态惩罚、在线状态信号与预算条件。', '#frontier', '近期方法'),
        ('建立公平实验', '读 Snell 的按题计算分配与 Timely Machine 的墙钟预算；确定 token、总训练成本和实际延迟三种口径。', '#conferences', '顶会方法与条件'),
        ('形成自己的问题', '结合蒸馏研究问：什么样的初始化最有利于后续预算策略学习？先与 SFT→RL、固定预算和 router 比较，再考虑更复杂组合。', './#adaptive', '原创研究方案'),
    ]
    out = ''
    for i, (title, text, url, label) in enumerate(steps, 1):
        out += '<article class="source-card"><h3>' + str(i) + ' · ' + esc(title) + '</h3>' + p(text) + link(url, label) + '</article>'
    return out


def open_questions():
    rows = [
        ('难度不是题目的固定属性', '同一道题对不同模型、不同模式和量化精度的可解性不同。要预测的是多算一点的收益，而不只是题目看起来有多难。改写、短难题与长易题是必要的校准测试。'),
        ('不确定不等于错误，置信也不等于正确', '概率、熵、一致性和中间答案稳定性都是代理信号。高置信错误可能过早停止，低置信正确可能被浪费计算；策略需要跨域和失败类型评估。'),
        ('控制决策的梯度怎样分配', '一次选模与几千个响应 token 同时学习，可能出现信号失衡。只训练控制损失又可能限制响应质量的共同改进。需拆开模式选择、停止与内容优化的贡献。'),
        ('节省的成本发生在哪里', 'token、FLOPs、墙钟耗时和并发吞吐各不相同。必须计入 router、PRM、额外采样、教师与工具成本；训练更贵的策略要在足够调用次数下才可能收回成本。'),
        ('平均收益是否掩盖重要切片退化', '平均长度下降可能来自困难题被更早放弃。质量约束、hard/OOD 切片、截断率和 p95 延迟应共同报告；不把 oracle Pass@k 当成用户实际拿到答案的正确率。'),
        ('怎样连接蒸馏、量化和自适应策略', '这是适合继续探索的研究问题：蒸馏初始化是否改善后续预算策略学习？量化改变概率校准后是否需要重新训练或校准路由？已有论文能提供动机，但不能代替组合方法的实验。'),
    ]
    out = p('以下是结合所列文献整理的研究判断与建议，用于形成可检验问题，不代表所有作者的共同结论。', 'small')
    for i, (title, text) in enumerate(rows, 1):
        out += detail(title, p(text), 'open-question-' + str(i))
    return out


def frontier():
    out = '<div class="note">' + p(FRONTIER_DATA['freshness_note']) + '</div>'
    formula_by_source = {x['source']: x for x in FRONTIER_DATA['formula_notes']}
    paper_names = {'simple_opd': 'Simple-OPD', 'adaptive_kl': 'Adaptive KL', 'quantization-reasoning': 'Quantization Meets Reasoning', 'shadow-ft': 'Shadow-FT', 'model-interpolation': 'Model Interpolation', 'timber': 'Timber', 'ptqtp': 'PTQTP'}
    for row in FRONTIER_DATA['papers']:
        body = '<div class="evidence"><span class="badge secondary">' + esc(row['position']) + '</span></div>'
        body += p(row['status'], 'small')
        if row['date_first']:
            body += p('首次公开：' + row['date_first'] + ' ｜ 最新：' + row['version'] + ' · ' + row['date_latest'], 'small')
        else:
            body += p(row['version'] + '。' + row.get('arxiv_note', ''), 'small')
        body += paragraph_fields(row, [('motivation','动机'),('method','方法')])
        body += '<h4>效果：保留条件，不只保留数字</h4>'
        body += p(row['result']['setup'], 'small') + p(row['result']['comparison']) + p(row['result']['interpretation'])
        body += p('定位：' + row['result']['location'], 'small')
        formula = formula_by_source.get(row['id'])
        if formula:
            body += '<h4>关键目标或监督信号</h4><div class="formula">' + esc(formula['formula']) + '</div>'
            body += p(formula['meaning']) + p(formula['guardrail'], 'small')
        body += '<h4>局限</h4>' + items(row['limits'])
        body += '<h4>带着什么问题读</h4>' + items(row['read_first'])
        body += '<h4>与已有研究连接的设想（尚未验证）</h4>' + p(row['research_extension'])
        body += '<div class="paper-links">' + ''.join(link('papers.html#paper-' + pid, paper_names[pid]) for pid in row['user_paper_links']) + '</div>'
        body += '<div class="paper-links">' + link(row['urls'].get('abstract') or row['urls']['proceedings'], '原始记录') + link(row['urls']['paper'], '核验论文版本')
        for key, label in [('code','作者代码'),('author_status','作者发表声明'),('university_status','学校发表声明'),('author_page','作者项目页')]:
            if row['urls'].get(key):
                body += link(row['urls'][key], label)
        body += '</div>'
        if row['id'] == 'sonata':
            body += '<div class="note">' + p('新增精读核对了 SC 的有监督标签、prefill 特征、阈值方向，以及正式表格与作者页面的差异。') + link('adaptive-products.html#sonata', '阅读 Sonata 精读与产品比较') + '</div>'
        out += detail(row['title'], body, 'frontier-' + row['id'])
    return out


def sources():
    rows = []
    for s in SURVEYS:
        rows.append((s['id'], 'survey', s['title'], s['url'], s['venue_status'], '首次 ' + s['first_version_date'] + ' · 最新 ' + s['latest_version_date'] + ' / ' + s['latest_version'], s['scope']))
    s = SURVEY_DATA['additional_recent_context']
    rows.append(('test-time-intelligence', 'survey', s['title'], s['url'], s['venue_status'], '首次／最新 ' + s['first_version_date'], s['scope_type']))
    for s in CONFERENCE_DATA['papers']:
        rows.append((s['id'], 'conference', s['title'], s['official_record_url'], s['venue'] + ' · ' + s['status'], s['publication_date'], s['mechanism']))
    for s in FRONTIER_DATA['papers']:
        rows.append((s['id'], 'frontier', s['title'], s['urls'].get('abstract') or s['urls']['proceedings'], s['status'], ('首次 ' + s['date_first'] + ' · 最新 ' + s['date_latest'] + ' / ' + s['version']) if s['date_first'] else s['version'], s['position']))
    out = ''
    for i, (ident, kind, title, url, status, date, note) in enumerate(rows, 1):
        out += f'<article class="source-card" data-source-card data-kind="{kind}" id="ref-{esc(ident)}"><h3>' + link(url, f'[{i}] ' + title) + '</h3>'
        out += '<div class="source-meta">' + esc(date + ' ｜ 核验：' + UPDATED) + '</div>' + p(status, 'small') + p(note) + '</article>'
    return out


replacements = {
    'UPDATED': UPDATED,
    'SURVEY_COUNT': str(len(SURVEYS) + 1),
    'CONFERENCE_COUNT': str(len(CONFERENCE_DATA['papers'])),
    'FRONTIER_COUNT': str(len(FRONTIER_DATA['papers'])),
    'MEANING_REFS': '<p class="small">定义与分类参考：' + link('https://arxiv.org/abs/2507.02076', 'Reasoning on a Budget') + '；' + link('https://arxiv.org/abs/2511.10788', 'From Efficiency to Adaptivity') + '。本页的“五个旋钮”是为阅读整理的教学框架。</p>',
    'MAP': method_map(),
    'SURVEYS': surveys(),
    'CONFERENCES': conferences(),
    'FRONTIER': frontier(),
    'QUESTIONS': open_questions(),
    'READING_ORDER': reading_order(),
    'SOURCES': sources(),
}
result = (PAGE / 'adaptive-template.html').read_text()
for key, value in replacements.items():
    assert '{{' + key + '}}' in result, key
    result = result.replace('{{' + key + '}}', value)
assert '{{' not in result
(PAGE / 'adaptive-thinking.html').write_text(result)
print(f'Built adaptive-thinking.html: {len(SURVEYS)+1} surveys, {len(CONFERENCE_DATA["papers"])} conference works, {len(FRONTIER_DATA["papers"])} frontier works.')
