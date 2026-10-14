#!/usr/bin/env python3
"""Build the static learning hub from curated, cited research notes."""
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


def p(text, cls=''):
    return f'<p class="{esc(cls)}">{esc(text)}</p>'


def items(values, ordered=False):
    tag = 'ol' if ordered else 'ul'
    return f'<{tag}>' + ''.join(f'<li>{esc(x)}</li>' for x in values) + f'</{tag}>'


def link(url, title, cls=''):
    external = ' target="_blank" rel="noopener noreferrer"' if url.startswith('https://') else ''
    return f'<a class="{esc(cls)}" href="{esc(url)}"{external}>{esc(title)}</a>'


def refs(ids):
    return ''.join(link('#source-' + i, '[' + str(SOURCE_NUMBER[i]) + ']', 'source-ref') for i in ids)


def detail(title, body, ident=None):
    identity = f' id="{esc(ident)}"' if ident else ''
    return f'<details class="study-detail"{identity}><summary>{esc(title)}</summary><div class="detail-body">{body}</div></details>'


def section_note(text, warm=False):
    return f'<div class="note{" warm" if warm else ""}">{p(text)}</div>'


def official_section(d):
    out = p('TGT 是京东的顶尖青年技术人才专项。以下信息区分校招与实习；匹配建议是根据你的研究经历作出的判断。')
    out += '<div class="grid">'
    for fact in d['verified_facts'][:2]:
        out += '<article class="card"><span class="badge">招聘信息</span>' + p(fact['claim'])
        if fact.get('confidence_note'):
            out += p(fact['confidence_note'], 'small')
        out += refs(fact['source_ids']) + '</article>'
    out += '</div>'
    out += '<h3 style="margin-top:24px">与训练、后训练和效率研究相关的 5 个职位</h3>'
    out += p('优先查看实习课题，再用预计毕业时间判断校招资格。职位详情在核验日可公开读取；这不等于仍有名额。若深链接失效，可在官方入口按完整题名搜索。', 'small')
    role_order = sorted(d['roles'], key=lambda r: (0 if r['source_id'] == 'tgt_intern_training' else 1, r['priority_inference']))
    for role in role_order:
        body = '<div class="evidence"><span class="badge">官方职位</span><span class="badge secondary">' + esc(role['program']) + '</span></div>'
        body += p('团队／城市：' + role['business'] + ' · ' + role['city'] + ' ｜ ' + role['category'], 'small')
        body += p(SOURCE_BY_ID[role['source_id']]['summary_zh'])
        body += '<h4>任职条件摘要</h4>' + p(role['requirements_summary'])
        body += '<h4>匹配判断</h4>' + p(role['fit_inference'])
        body += link(role['url'], '查看官方职位') + ' ' + refs([role['source_id']])
        out += detail(role['title'], body, 'job-' + role['source_id'])
    out += '<h3 style="margin-top:24px">申请路径与需要确认的信息</h3>' + items(d['application_path']['steps'], True) + refs(d['application_path']['source_ids'])
    out += section_note('核验到的职位标注远程面试。尚无充分官方依据确认统一轮数、固定题型、统一论文数量或薪资门槛。与招聘方确认：具体课题与导师、校招还是实习、预计毕业与到岗要求、面试形式、是否安排代码或研究报告。')
    out += p(d['match_recommendations'][1]['text']) + refs(d['match_recommendations'][1]['source_ids'])
    return out


def other_programs(d):
    out = p('保留官方入口作为拓展，不把不同计划的毕业范围、流程或待遇混为一谈。')
    for row in d['adjacent_programs']:
        s = SOURCE_BY_ID[row['source_ids'][0]]
        out += '<article class="source-card"><h3>' + link(row['official_url'], row['name']) + '</h3>' + p(row['use']) + p(s['summary_zh'], 'small') + refs(row['source_ids']) + '</article>'
    return out


def source_cards():
    out = ''
    for s in SOURCES:
        kind = s['_kind']
        date = s.get('published_date') or s.get('post_date') or s.get('date') or s.get('published_at') or ('固定版本见下方' if kind == 'paper' else '原页面未明确发布日期')
        stype = s.get('source_type') or s.get('type') or ('论文 / 技术文档' if kind == 'paper' else '个人面试经验')
        accessed = s.get('accessed_at') or s.get('accessed_date') or UPDATED
        out += f'<article class="source-card" data-source-card data-kind="{esc(kind)}" id="source-{esc(s["id"])}">'
        out += '<h3>' + link(s['url'], f'[{SOURCE_NUMBER[s["id"]]}] {s["title"]}') + '</h3>'
        out += '<div class="source-meta">' + esc(f'{stype} · 发布：{date} · 核验：{accessed}') + '</div>'
        summary = s.get('summary_zh') or s.get('fact_summary') or s.get('summary')
        if summary:
            out += p(summary)
        if s.get('version'):
            out += p('版本：' + s['version'] + ' ｜ 建议阅读：' + s['read_sections'], 'small')
        if s.get('key_equation'):
            body = '<div class="formula">' + esc(s['key_equation']) + '</div>'
            body += '<h4>成立条件与容易误读之处</h4>' + p(s['conditions_and_pitfalls'])
            body += '<h4>面试阅读目的</h4>' + p(s['interview_value'])
            if s.get('additional_urls'):
                body += '<div class="paper-links">' + ''.join(link(url, '补充原始资料 ' + str(i + 1)) for i, url in enumerate(s['additional_urls'])) + '</div>'
            out += detail('阅读重点与公式边界', body)
        note = s.get('source_notes') or s.get('notes') or s.get('note') or ''
        if isinstance(note, list):
            note = '；'.join(note)
        if note:
            out += p(note, 'muted')
        out += '</article>'
    return out


def interview_section(d):
    out = section_note(d['conclusion'], True)
    out += '<div class="legend"><span class="badge">官方招聘：核对资格与课题</span><span class="badge secondary">个人面经：了解追问方式</span><span class="badge caution">原创练习：训练自己的回答</span></div>'
    for i, s in enumerate(d['sources']):
        body = '<div class="evidence"><span class="badge secondary">普通京东岗位 · 非 TGT</span><span class="badge caution">' + ('应用侧辅助' if i >= 3 else '与训练较相关') + '</span></div>'
        body += p(s['role']) + p('发布：' + s['post_date'] + ' ｜ 面试：' + s['interview_date'], 'small')
        body += p(s['summary'])
        body += '<div class="topic-list">' + ''.join('<span>' + esc(x) + '</span>' for x in s['question_categories']) + '</div>'
        body += p(s['evidence_quality'], 'small')
        if s.get('technical_correction'):
            body += section_note(s['technical_correction'], True)
        body += '<h4>使用边界</h4>' + items(s['limits']) + link(s['url'], '阅读原帖') + ' ' + refs([s['id']])
        out += detail(s['title'], body, 'interview-' + s['id'])
    out += p('已排除岗位混杂的题目汇编、无法核验原文的热榜标题、商业推广和高度重复的题单。上述数量不代表京东或 TGT 面试的统计分布。', 'small')
    out += '<h3 style="margin-top:24px">从这些材料中可以练习什么</h3>' + items(d['preparation_inference'])
    return out


PAPER_NAMES = {
    'loca': 'LoCa', 'adaptive_kl': 'Adaptive KL', 'llm_neo': 'LLM-NEO',
    'profit': 'ProFit', 'simple_opd': 'Simple-OPD', 'shadow-ft': 'Shadow-FT',
    'timber': 'Timber', 'model-interpolation': 'Model Interpolation',
    'ptqtp': 'PTQTP', 'fluxbin': 'FluxBin', 'lieq': 'LieQ',
    'quantization-reasoning': 'Quantization Meets Reasoning',
    'memristor-reasoning': 'LLMs on Memristors',
    'art-efficient-reasoning': 'The Art of Efficient Reasoning',
    'rl-starts-before-rl': 'RL Starts before RL',
}


def technical_section(d):
    a = d['adaptive_thinking']
    out = section_note(a['working_definition'])
    body = '<div class="table-wrap"><table><thead><tr><th>概念</th><th>谁决定、何时决定</th><th>与自适应计算的关系</th></tr></thead><tbody>'
    for row in a['distinction_table']:
        body += '<tr><td>' + esc(row['concept']) + '</td><td>' + esc(row['decision']) + '</td><td>' + esc(row['relation']) + p(row['example'], 'small') + '</td></tr>'
    body += '</tbody></table></div>' + p(a['key_answer']) + refs(a['source_ids'])
    out += detail('先辨析：模式、预算、路由、early exit 与隐藏推理', body, 'adaptive-terms')
    for i, m in enumerate(d['modules']):
        body = p(m['core_question'], 'quote') + p(m['concise_answer'])
        body += '<h4>白板表达</h4><div class="formula">' + esc(m['whiteboard']) + '</div>'
        for qa in m['followups']:
            body += '<h4>' + esc(qa['q']) + '</h4>' + p(qa['a'], 'question-answer')
        body += '<h4>回到自己的论文</h4><ul>'
        for mapping in m['paper_mapping']:
            pid = mapping['paper_id']
            body += '<li>' + link('papers.html#paper-' + pid, PAPER_NAMES[pid]) + '：' + esc(mapping['bridge']) + '</li>'
        body += '</ul>' + refs(m['source_ids'])
        out += detail(f'{i + 1:02d} · ' + m['title'], body, 'module-' + m['id'])
    return out


def labeled_fields(d, labels):
    out = ''
    for key, label in labels:
        if key not in d:
            continue
        out += '<h4>' + esc(label) + '</h4>'
        out += items(d[key]) if isinstance(d[key], list) else p(d[key])
    return out


def adaptive_section(d):
    a, r = d['adaptive_thinking'], d['project']
    out = '<div class="evidence"><span class="badge caution">原创研究设计 · 尚未执行</span></div>'
    out += p(r['research_question']) + p(r['status'], 'small')
    out += '<div class="diagram" aria-label="建议实验流程"><span>双模式 SFT</span><b>→</b><span>条件化 OPD</span><b>→</b><span>模式与停止策略 RL</span><b>→</b><span>质量／成本／延迟</span></div>'
    out += '<div class="formula">' + esc(a['formalization']) + '</div>'
    out += detail('用 90 秒讲清这项研究设想', p(r['interview_pitch']) + items(r['hypothesis']), 'research-pitch')
    out += detail('最小实验：模型、数据规模与资源边界', labeled_fields(r['minimal_setup'], [('student','学生'),('teacher','教师'),('rationale','选择依据'),('budget_conditions','预算条件'),('resource_gate','先做资源试测'),('minimal_run','首轮规模')]))
    out += detail('数据、难度分层与防泄漏', labeled_fields(r['data'], [('domains','候选任务'),('split','划分顺序'),('pilot_difficulty','相对于当前学生的难度'),('mixing','难度混合'),('leakage_controls','泄漏检查')]))
    for stage in r['stages']:
        body = labeled_fields(stage, [('action','操作'),('purpose','目的'),('math','目标'),('reward','奖励'),('reward_scope','这个奖励能保证什么'),('cost','成本口径'),('optimization','优化对照'),('monitoring','需要记录的指标'),('ablation','消融'),('caveat','边界')])
        out += detail(stage['stage'], body)
    out += detail('强基线与公平比较', items(r['fair_baselines']))
    out += detail('评估协议：什么结果才支持“更高效”', labeled_fields(r['evaluation'], [('primary','主要指标'),('latency','真实延迟与吞吐'),('quality_slices','质量切片'),('diagnostics','覆盖诊断'),('uncertainty','不确定性'),('training_cost','总训练成本'),('acceptance','事先确定接受条件'),('invalid_claims','不能据此声称有效的比较')]))
    out += detail('消融、负结果与已有论文的关系', items(r['ablations']) + '<h4>应该接受的负结果</h4>' + items(r['negative_results_to_accept']) + p(r['relation_to_existing_work']))
    out += refs(r['source_ids'])
    return out


def practice_section(d):
    out = ''
    for q in d['original_mock_questions']:
        body = p(q['question'], 'quote') + '<h4>继续追问</h4>' + items(q['followups']) + '<h4>答题自查</h4>' + p(q['check'])
        out += detail(q['id'] + ' · ' + q['topic'], body, 'mock-' + q['id'])
    out += '<h3 style="margin-top:25px">三个小实现：手算结果比背代码更有用</h3>'
    out += detail('练习 A · 组内优势与 mask', p('实现 G 个回报的组内标准化，组内方差使用总体方差；回报与优势 detach。给出 padding mask 下 token log-prob 的 sum 与 mean 两种归约。') + '<div class="formula">R=[1,1,0,0] → mean=0.5, std=0.5 → A≈[1,1,−1,−1]\nR=[1,1,1,1] → A=[0,0,0,0]（仅结果奖励，无额外项）\nlogp=[−1,−2,−3], mask=[1,1,0] → sum=−3, mean=−1.5</div>' + p('明确 epsilon、EOS 与截断处理；全 padding 样本应跳过或报错，不能静默制造有效样本。PyTorch 的 std 默认修正项可能与这里的总体方差口径不同，实现时显式指定。'))
    out += detail('练习 B · 学生前缀上的 FKL / RKL', p('固定同一批学生生成前缀，对教师与学生 logits 用 log_softmax，教师分布 detach。按完整词表计算两个 KL，区分温度变换、损失 mask 与长度归约。') + '<div class="formula">p=student=[0.5,0.5], q=teacher=[0.75,0.25]\nFKL=KL(q‖p)≈0.130812 nats\nRKL=KL(p‖q)≈0.143841 nats\np=q 时两者均为 0</div>' + p('检查非负性、词表维度、teacher 是否得到梯度；若只保留 top-k 或只抽一个 token，说明它近似了什么，不能仍把结果当完整 KL。'))
    out += detail('练习 C · 一张诚实的质量—成本图', p('输入逐题记录：模式、预算、正确性、总生成 token、耗时、截断状态；输出每预算质量、平均 token、p50/p95 延迟和困难题切片。') + items(['构造“平均 token 下降但困难题准确率大降”的样例，确认报表能看见退化。','同一批题配对计算质量差；模式或超参数只用验证集选。','明确某方法质量更高且成本更低时才支配另一点；不要把 accuracy/token 作为唯一指标。']))
    out += '<h3 style="margin-top:25px">适合向团队反问的四个问题</h3>' + items(['课题更偏基座能力、Reasoning 后训练，还是 Agent 应用与 RL infra？实习预期交付是什么？','训练的主要瓶颈目前在数据／奖励、探索与优化，还是 rollout 和分布式系统？','如何同时评价通用能力、真实任务收益和推理成本？现有强基线是什么？','研究与工程如何分工，导师反馈节奏、可用资源、实习时长和论文发表安排怎样？'])
    return out


def plan_section(d):
    out = ''
    for row in d['checklist']:
        ident = f'plan-day-{row["day"]}'
        out += '<div class="plan-day"><input data-plan-check type="checkbox" id="' + ident + '"><div><label for="' + ident + '"><span class="day-index">DAY ' + f'{row["day"]:02d}' + '</span>' + esc(row['task']) + '</label>'
        out += p('交付物：' + row['deliverable']) + refs(row['source_ids']) + '</div></div>'
    out += section_note(d['ten_day_compression']) + p(d['no_gpu_path'], 'small')
    return out


OFFICIAL = read('official')
INTERVIEWS = read('interviews')
TECHNICAL = read('technical')
SOURCES = []
for s in OFFICIAL['sources']:
    s['_kind'] = 'university' if '高校' in s['source_type'] else 'official'
    SOURCES.append(s)
for s in INTERVIEWS['sources']:
    s['_kind'] = 'interview'
    SOURCES.append(s)
for s in TECHNICAL['sources']:
    s['_kind'] = 'paper'
    SOURCES.append(s)
SOURCE_BY_ID = {s['id']: s for s in SOURCES}
assert len(SOURCE_BY_ID) == len(SOURCES), 'Source IDs must be unique'
SOURCE_NUMBER = {s['id']: i + 1 for i, s in enumerate(SOURCES)}

replacements = {
    'UPDATED': UPDATED,
    'SOURCE_COUNT': str(len(SOURCES)),
    'OFFICIAL': official_section(OFFICIAL),
    'INTERVIEWS': interview_section(INTERVIEWS),
    'TECHNICAL': technical_section(TECHNICAL),
    'ADAPTIVE': adaptive_section(TECHNICAL),
    'PRACTICE': practice_section(INTERVIEWS),
    'PLAN': plan_section(TECHNICAL['plan']),
    'OTHER_PROGRAMS': other_programs(OFFICIAL),
    'SOURCES': source_cards(),
}
result = (PAGE / 'template.html').read_text()
for key, value in replacements.items():
    assert '{{' + key + '}}' in result, key
    result = result.replace('{{' + key + '}}', value)
assert '{{' not in result, 'Unfilled template placeholder'
(PAGE / 'index.html').write_text(result)
print(f'Built learning/index.html: {len(SOURCES)} sources, {len(TECHNICAL["modules"])} modules, {len(TECHNICAL["plan"]["checklist"])} study days.')
