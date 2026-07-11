import { useMemo, useState } from 'react';
import { useAppConfig } from '../../context/AppConfigContext';
import type {
  AppConfig,
  DecisionChoice,
  DecisionConfig,
  EquipmentItem,
  MetricKey,
  ResultBand,
} from '../../types/config';
import { analyzeGameBalance } from '../game/gameEngine';
import { downloadConfig, parseConfigJson } from '../../utils/configTransfer';
import { validateConfig } from '../../utils/configValidation';
import { formatCurrency } from '../../utils/format';
import styles from './SettingsPage.module.css';

type SettingsTab = 'branding' | 'scenario' | 'market' | 'decisions' | 'results' | 'data';

const metricKeys: MetricKey[] = ['cash', 'reputation', 'quality', 'capacity', 'risk', 'customers', 'fatigue'];

export function SettingsPage() {
  const { config, setConfig, updateConfig, resetConfig } = useAppConfig();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('detailer-creator-unlocked') === 'true');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [tab, setTab] = useState<SettingsTab>('branding');
  const [notice, setNotice] = useState('');
  const issues = useMemo(() => validateConfig(config), [config]);
  const balance = useMemo(() => {
    try {
      return analyzeGameBalance(config);
    } catch {
      return null;
    }
  }, [config]);

  const unlock = () => {
    if (pin === config.security.creatorPin) {
      sessionStorage.setItem('detailer-creator-unlocked', 'true');
      setUnlocked(true);
      setPinError('');
    } else {
      setPinError('PIN incorreto. O PIN inicial da demonstração está documentado no README.');
    }
  };

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  if (!unlocked) {
    return (
      <main className={styles.lockPage}>
        <section className={styles.lockCard}>
          <span className={styles.lockIcon}>⚙</span>
          <span className="eyebrow">Área do criador</span>
          <h1>Configurações protegidas</h1>
          <p>Esta área altera conteúdo, lógica, preços, identidade e resultados do produto. No MVP, a proteção é local; em produção, deve ser substituída por autenticação real.</p>
          <label>
            PIN do criador
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && unlock()}
              placeholder="Digite o PIN"
            />
          </label>
          {pinError && <small className={styles.error}>{pinError}</small>}
          <button className="primaryButton" type="button" onClick={unlock}>Acessar configurações</button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div>
          <span className="eyebrow">Painel do criador</span>
          <h2>Personalização</h2>
          <p>As alterações são salvas automaticamente neste navegador.</p>
        </div>
        <nav>
          <TabButton id="branding" active={tab} onClick={setTab}>Marca e acesso</TabButton>
          <TabButton id="scenario" active={tab} onClick={setTab}>Cenário-base</TabButton>
          <TabButton id="market" active={tab} onClick={setTab}>Mercado e veículos</TabButton>
          <TabButton id="decisions" active={tab} onClick={setTab}>Decisões</TabButton>
          <TabButton id="results" active={tab} onClick={setTab}>Resultados</TabButton>
          <TabButton id="data" active={tab} onClick={setTab}>Dados e validação</TabButton>
        </nav>
      </aside>

      <section className={styles.content}>
        {tab === 'branding' && <BrandingSettings config={config} updateConfig={updateConfig} notify={notify} />}
        {tab === 'scenario' && <ScenarioSettings config={config} updateConfig={updateConfig} />}
        {tab === 'market' && <MarketSettings config={config} updateConfig={updateConfig} />}
        {tab === 'decisions' && <DecisionSettings config={config} updateConfig={updateConfig} />}
        {tab === 'results' && <ResultSettings config={config} updateConfig={updateConfig} />}
        {tab === 'data' && (
          <DataSettings
            config={config}
            setConfig={setConfig}
            resetConfig={resetConfig}
            issues={issues}
            balance={balance}
            notify={notify}
          />
        )}
      </section>
      {notice && <div className={styles.toast}>{notice}</div>}
    </main>
  );
}

function TabButton({ id, active, onClick, children }: { id: SettingsTab; active: SettingsTab; onClick: (id: SettingsTab) => void; children: string }) {
  return <button className={active === id ? styles.activeTab : ''} type="button" onClick={() => onClick(id)}>{children}</button>;
}

function BrandingSettings({ config, updateConfig, notify }: SharedProps & { notify: (message: string) => void }) {
  const uploadLogo = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      notify('Use uma imagem PNG, JPG ou JPEG.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateConfig((current) => ({ ...current, brand: { ...current.brand, logoDataUrl: String(reader.result) } }));
    reader.readAsDataURL(file);
  };

  return (
    <SettingsModule title="Marca, apresentação e acesso" description="Personalize toda a apresentação do produto para o método do criador.">
      <div className={styles.formGrid}>
        <Field label="Nome do aplicativo"><input value={config.brand.appName} onChange={(e) => patchBrand(updateConfig, 'appName', e.target.value)} /></Field>
        <Field label="Nome do criador ou método"><input value={config.brand.creatorName} onChange={(e) => patchBrand(updateConfig, 'creatorName', e.target.value)} /></Field>
        <Field label="Tagline"><input value={config.brand.tagline} onChange={(e) => patchBrand(updateConfig, 'tagline', e.target.value)} /></Field>
        <Field label="Cor de destaque"><div className={styles.colorField}><input type="color" value={config.brand.accentColor} onChange={(e) => patchBrand(updateConfig, 'accentColor', e.target.value)} /><input value={config.brand.accentColor} onChange={(e) => patchBrand(updateConfig, 'accentColor', e.target.value)} /></div></Field>
        <Field label="Título da abertura" wide><input value={config.brand.introTitle} onChange={(e) => patchBrand(updateConfig, 'introTitle', e.target.value)} /></Field>
        <Field label="Descrição da abertura" wide><textarea rows={4} value={config.brand.introDescription} onChange={(e) => patchBrand(updateConfig, 'introDescription', e.target.value)} /></Field>
        <Field label="Aviso educacional" wide><textarea rows={3} value={config.brand.supportText} onChange={(e) => patchBrand(updateConfig, 'supportText', e.target.value)} /></Field>
        <Field label="Novo PIN do criador"><input type="password" inputMode="numeric" value={config.security.creatorPin} onChange={(e) => updateConfig((current) => ({ ...current, security: { creatorPin: e.target.value } }))} /></Field>
      </div>
      <div className={styles.logoModule}>
        <div className={styles.logoPreview}>{config.brand.logoDataUrl ? <img src={config.brand.logoDataUrl} alt="Prévia da logo" /> : <span>Sem logo</span>}</div>
        <div>
          <h3>Logo da marca</h3>
          <p>PNG, JPG ou JPEG. A imagem fica salva localmente como Data URL nesta versão.</p>
          <label className="secondaryButton">Selecionar arquivo<input hidden type="file" accept="image/png,image/jpeg,.jpg,.jpeg" onChange={(event) => uploadLogo(event.target.files?.[0])} /></label>
          {config.brand.logoDataUrl && <button className="ghostButton" type="button" onClick={() => patchBrand(updateConfig, 'logoDataUrl', '')}>Remover logo</button>}
        </div>
      </div>
    </SettingsModule>
  );
}

function ScenarioSettings({ config, updateConfig }: SharedProps) {
  return (
    <SettingsModule title="Cenário e indicadores iniciais" description="Defina a duração, o capital e o ponto de partida da simulação.">
      <div className={styles.formGrid}>
        <Field label="Duração simulada (dias)"><input type="number" min="1" value={config.scenario.durationDays} onChange={(e) => updateConfig((current) => ({ ...current, scenario: { ...current.scenario, durationDays: Number(e.target.value) } }))} /></Field>
        <Field label="Código da moeda"><input value={config.scenario.currency} onChange={(e) => updateConfig((current) => ({ ...current, scenario: { ...current.scenario, currency: e.target.value.toUpperCase() } }))} /></Field>
      </div>
      <h3 className={styles.subheading}>Indicadores iniciais</h3>
      <div className={styles.metricEditor}>
        {metricKeys.map((metric) => (
          <Field key={metric} label={metricName(metric)}>
            <input
              type="number"
              value={config.scenario.initialMetrics[metric]}
              onChange={(e) => updateConfig((current) => ({
                ...current,
                scenario: {
                  ...current.scenario,
                  initialMetrics: { ...current.scenario.initialMetrics, [metric]: Number(e.target.value) },
                },
              }))}
            />
          </Field>
        ))}
      </div>
    </SettingsModule>
  );
}

function MarketSettings({ config, updateConfig }: SharedProps) {
  const updateEquipment = (index: number, next: EquipmentItem) => updateConfig((current) => {
    const equipment = [...current.scenario.equipment];
    equipment[index] = next;
    return { ...current, scenario: { ...current.scenario, equipment } };
  });

  return (
    <>
      <SettingsModule title="Equipamentos e fontes de preço" description="Cada valor pode ser alterado. O botão de média recalcula o preço usando todas as fontes cadastradas.">
        <div className={styles.stack}>
          {config.scenario.equipment.map((item, itemIndex) => (
            <details key={item.id} className={styles.editorCard} open={itemIndex === 0}>
              <summary><span>{item.shortName}</span><strong>{formatCurrency(item.price)}</strong></summary>
              <div className={styles.editorBody}>
                <div className={styles.formGrid}>
                  <Field label="Nome completo" wide><input value={item.name} onChange={(e) => updateEquipment(itemIndex, { ...item, name: e.target.value })} /></Field>
                  <Field label="Nome curto"><input value={item.shortName} onChange={(e) => updateEquipment(itemIndex, { ...item, shortName: e.target.value })} /></Field>
                  <Field label="Preço usado"><input type="number" step="0.01" value={item.price} onChange={(e) => updateEquipment(itemIndex, { ...item, price: Number(e.target.value) })} /></Field>
                  <Field label="Descrição" wide><textarea value={item.description} onChange={(e) => updateEquipment(itemIndex, { ...item, description: e.target.value })} /></Field>
                </div>
                <div className={styles.sourceHeading}>
                  <h4>Fontes ({item.sources.length})</h4>
                  <div className={styles.inlineActions}><button className="ghostButton" type="button" onClick={() => updateEquipment(itemIndex, { ...item, sources: [...item.sources, { retailer: 'Nova fonte', price: item.price, url: '', checkedAt: new Date().toISOString().slice(0, 10) }] })}>Adicionar fonte</button><button className="secondaryButton" type="button" onClick={() => {
                    const average = item.sources.reduce((total, source) => total + source.price, 0) / Math.max(1, item.sources.length);
                    updateEquipment(itemIndex, { ...item, price: Math.round(average * 100) / 100 });
                  }}>Usar média</button></div>
                </div>
                <div className={styles.sourceList}>
                  {item.sources.map((source, sourceIndex) => (
                    <div className={styles.sourceRow} key={`${source.retailer}-${sourceIndex}`}>
                      <input aria-label="Varejista" value={source.retailer} onChange={(e) => {
                        const sources = [...item.sources]; sources[sourceIndex] = { ...source, retailer: e.target.value }; updateEquipment(itemIndex, { ...item, sources });
                      }} />
                      <input aria-label="Preço" type="number" step="0.01" value={source.price} onChange={(e) => {
                        const sources = [...item.sources]; sources[sourceIndex] = { ...source, price: Number(e.target.value) }; updateEquipment(itemIndex, { ...item, sources });
                      }} />
                      <input aria-label="Data" type="date" value={source.checkedAt} onChange={(e) => {
                        const sources = [...item.sources]; sources[sourceIndex] = { ...source, checkedAt: e.target.value }; updateEquipment(itemIndex, { ...item, sources });
                      }} />
                      <input aria-label="URL" value={source.url} onChange={(e) => {
                        const sources = [...item.sources]; sources[sourceIndex] = { ...source, url: e.target.value }; updateEquipment(itemIndex, { ...item, sources });
                      }} />
                      <button className={styles.removeSource} type="button" aria-label="Remover fonte" onClick={() => updateEquipment(itemIndex, { ...item, sources: item.sources.filter((_, index) => index !== sourceIndex) })}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </SettingsModule>

      <SettingsModule title="Veículos usados nos cenários" description="Marca e modelo aparecem nas situações vinculadas. Segmento, tamanho e sujeira ajustam esforço, risco e custo de correção nas decisões relacionadas ao veículo.">
        <div className={styles.tableEditor}>
          {config.scenario.cars.map((car, index) => (
            <div className={styles.carRow} key={car.id}>
              <input value={car.brand} onChange={(e) => patchCar(updateConfig, index, { ...car, brand: e.target.value })} />
              <input value={car.model} onChange={(e) => patchCar(updateConfig, index, { ...car, model: e.target.value })} />
              <select value={car.segment} onChange={(e) => patchCar(updateConfig, index, { ...car, segment: e.target.value as typeof car.segment })}>
                <option value="hatch">Hatch</option><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="pickup">Picape</option>
              </select>
              <input title="Fator de tamanho" type="number" step="0.01" value={car.sizeFactor} onChange={(e) => patchCar(updateConfig, index, { ...car, sizeFactor: Number(e.target.value) })} />
              <input title="Fator de sujeira" type="number" step="0.01" value={car.soilFactor} onChange={(e) => patchCar(updateConfig, index, { ...car, soilFactor: Number(e.target.value) })} />
            </div>
          ))}
        </div>
      </SettingsModule>
    </>
  );
}

function DecisionSettings({ config, updateConfig }: SharedProps) {
  const patchDecision = (index: number, next: DecisionConfig) => updateConfig((current) => {
    const decisions = [...current.scenario.decisions]; decisions[index] = next;
    return { ...current, scenario: { ...current.scenario, decisions } };
  });

  const patchChoice = (decisionIndex: number, choiceIndex: number, next: DecisionChoice) => {
    const decision = config.scenario.decisions[decisionIndex];
    const choices = [...decision.choices]; choices[choiceIndex] = next;
    patchDecision(decisionIndex, { ...decision, choices });
  };

  return (
    <SettingsModule title="Situações e consequências" description="Edite textos, recomendações e impactos. Os números são aplicados pelo motor com limites e validação de caixa.">
      <div className={styles.stack}>
        {config.scenario.decisions.map((decision, decisionIndex) => (
          <details key={decision.id} className={styles.editorCard} open={decisionIndex === 0}>
            <summary><span>{decisionIndex + 1}. {decision.title}</span><small>{decision.module}</small></summary>
            <div className={styles.editorBody}>
              <div className={styles.formGrid}>
                <Field label="Módulo"><input value={decision.module} onChange={(e) => patchDecision(decisionIndex, { ...decision, module: e.target.value })} /></Field>
                <Field label="Marcador temporal"><input value={decision.eyebrow} onChange={(e) => patchDecision(decisionIndex, { ...decision, eyebrow: e.target.value })} /></Field>
                <Field label="Título" wide><input value={decision.title} onChange={(e) => patchDecision(decisionIndex, { ...decision, title: e.target.value })} /></Field>
                <Field label="Situação" wide><textarea rows={4} value={decision.situation} onChange={(e) => patchDecision(decisionIndex, { ...decision, situation: e.target.value })} /></Field>
                <Field label="Orientação do método" wide><textarea rows={3} value={decision.mentorTip} onChange={(e) => patchDecision(decisionIndex, { ...decision, mentorTip: e.target.value })} /></Field>
                <Field label="Veículo usado nesta situação"><select value={decision.vehicleId ?? ''} onChange={(e) => patchDecision(decisionIndex, { ...decision, vehicleId: e.target.value || undefined })}><option value="">Sem veículo vinculado</option>{config.scenario.cars.map((car) => <option key={car.id} value={car.id}>{car.brand} {car.model}</option>)}</select></Field>
                <Field label="Animação da cena"><select value={decision.animation} onChange={(e) => patchDecision(decisionIndex, { ...decision, animation: e.target.value as DecisionConfig['animation'] })}><option value="garage">Garagem</option><option value="mobile">Delivery</option><option value="store">Loja</option><option value="equipment">Equipamentos</option><option value="washing">Lavagem</option><option value="polishing">Polimento</option><option value="interior">Interior</option><option value="pricing">Precificação</option><option value="complaint">Reclamação</option><option value="growth">Crescimento</option></select></Field>
              </div>
              <div className={styles.choiceEditorList}>
                {decision.choices.map((choice, choiceIndex) => (
                  <article key={choice.id} className={styles.choiceEditor}>
                    <div className={styles.choiceEditorHeader}>
                      <strong>Escolha {choiceIndex + 1}</strong>
                      <label className={styles.checkLabel}><input type="checkbox" checked={Boolean(choice.recommended)} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, recommended: e.target.checked })} /> Recomendada</label>
                    </div>
                    <div className={styles.formGrid}>
                      <Field label="Nome"><input value={choice.label} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, label: e.target.value })} /></Field>
                      <Field label="Descrição"><input value={choice.description} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, description: e.target.value })} /></Field>
                      <Field label="Consequência" wide><textarea rows={2} value={choice.consequence} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, consequence: e.target.value })} /></Field>
                    </div>
                    <div className={styles.effectsEditor}>
                      {metricKeys.map((metric) => (
                        <Field key={metric} label={metricName(metric)}>
                          <input type="number" value={choice.effects[metric] ?? 0} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, effects: { ...choice.effects, [metric]: Number(e.target.value) } })} />
                        </Field>
                      ))}
                    </div>
                    <details className={styles.advancedChoice}>
                      <summary>Regras avançadas da escolha</summary>
                      <div className={styles.formGrid}>
                        <Field label="Flags concedidas (separadas por vírgula)" wide><input value={(choice.grants ?? []).join(', ')} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, grants: splitFlags(e.target.value) })} /></Field>
                        <Field label="Flags obrigatórias"><input value={(choice.requirements?.requiredFlags ?? []).join(', ')} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, requirements: { ...choice.requirements, requiredFlags: splitFlags(e.target.value) } })} /></Field>
                        <Field label="Uma destas flags"><input value={(choice.requirements?.requiredAnyFlags ?? []).join(', ')} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, requirements: { ...choice.requirements, requiredAnyFlags: splitFlags(e.target.value) } })} /></Field>
                        <Field label="Caixa mínimo após escolha"><input type="number" value={choice.requirements?.minCashAfter ?? 0} onChange={(e) => patchChoice(decisionIndex, choiceIndex, { ...choice, requirements: { ...choice.requirements, minCashAfter: Number(e.target.value) } })} /></Field>
                      </div>
                      <div className={styles.equipmentChecks}><strong>Equipamentos cobrados automaticamente</strong>{config.scenario.equipment.map((equipment) => <label key={equipment.id}><input type="checkbox" checked={Boolean(choice.costEquipmentIds?.includes(equipment.id))} onChange={(e) => { const current = choice.costEquipmentIds ?? []; const costEquipmentIds = e.target.checked ? [...current, equipment.id] : current.filter((id) => id !== equipment.id); patchChoice(decisionIndex, choiceIndex, { ...choice, costEquipmentIds }); }} /> {equipment.shortName}</label>)}</div>
                    </details>
                  </article>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </SettingsModule>
  );
}

function ResultSettings({ config, updateConfig }: SharedProps) {
  const patchBand = (index: number, next: ResultBand) => updateConfig((current) => {
    const resultBands = [...current.scenario.resultBands]; resultBands[index] = next;
    return { ...current, scenario: { ...current.scenario, resultBands } };
  });

  return (
    <SettingsModule title="Faixas e conclusão final" description="Configure a conclusão que o aluno recebe e alinhe a orientação ao método individual do criador.">
      <h3 className={styles.subheading}>Pesos da pontuação</h3>
      <div className={styles.metricEditor}>{(['cash','reputation','quality','capacity','risk','fatigue'] as const).map((metric) => <Field key={metric} label={metricName(metric)}><input type="number" min="0" max="1" step="0.01" value={config.scenario.scoreWeights[metric]} onChange={(e) => updateConfig((current) => ({ ...current, scenario: { ...current.scenario, scoreWeights: { ...current.scenario.scoreWeights, [metric]: Number(e.target.value) } } }))} /></Field>)}</div>
      <h3 className={styles.subheading}>Faixas de conclusão</h3>
      <div className={styles.stack}>
        {config.scenario.resultBands.map((band, index) => (
          <article className={styles.editorCardStatic} key={band.id}>
            <div className={styles.rangeHeader}><strong>{band.title}</strong><span>{band.minScore}–{band.maxScore} pontos</span></div>
            <div className={styles.formGrid}>
              <Field label="Pontuação mínima"><input type="number" min="0" max="100" value={band.minScore} onChange={(e) => patchBand(index, { ...band, minScore: Number(e.target.value) })} /></Field>
              <Field label="Pontuação máxima"><input type="number" min="0" max="100" value={band.maxScore} onChange={(e) => patchBand(index, { ...band, maxScore: Number(e.target.value) })} /></Field>
              <Field label="Título" wide><input value={band.title} onChange={(e) => patchBand(index, { ...band, title: e.target.value })} /></Field>
              <Field label="Resumo" wide><textarea rows={3} value={band.summary} onChange={(e) => patchBand(index, { ...band, summary: e.target.value })} /></Field>
              <Field label="Conclusão pelo método" wide><textarea rows={4} value={band.methodFeedback} onChange={(e) => patchBand(index, { ...band, methodFeedback: e.target.value })} /></Field>
            </div>
          </article>
        ))}
      </div>
    </SettingsModule>
  );
}


function DataSettings({
  config,
  setConfig,
  resetConfig,
  issues,
  balance,
  notify,
}: {
  config: AppConfig;
  setConfig: (next: AppConfig) => void;
  resetConfig: () => void;
  issues: ReturnType<typeof validateConfig>;
  balance: ReturnType<typeof analyzeGameBalance> | null;
  notify: (message: string) => void;
}) {
  const importConfig = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseConfigJson(String(reader.result));
        const importedIssues = validateConfig(imported);
        const errors = importedIssues.filter((issue) => issue.level === 'error');
        if (errors.length) {
          notify(`Importação bloqueada: ${errors[0].message}`);
          return;
        }
        setConfig(imported);
        notify('Configuração importada com sucesso.');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Não foi possível importar o arquivo.');
      }
    };
    reader.readAsText(file);
  };

  const restore = () => {
    if (!window.confirm('Restaurar toda a configuração original do Detailer Business?')) return;
    resetConfig();
    notify('Configuração original restaurada.');
  };

  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  return (
    <>
      <SettingsModule title="Dados, backup e validação" description="Exporte uma versão revisável, importe configurações e verifique automaticamente coerência, caminhos e balanceamento.">
        <div className={styles.dataActions}>
          <button className="primaryButton" type="button" onClick={() => downloadConfig(config)}>Exportar configuração JSON</button>
          <label className="secondaryButton">Importar configuração<input hidden type="file" accept="application/json,.json" onChange={(event) => importConfig(event.target.files?.[0])} /></label>
          <button className="ghostButton" type="button" onClick={restore}>Restaurar configuração original</button>
        </div>
        <p className={styles.productionNote}>A importação só é aplicada quando não existem erros estruturais. Alertas pedagógicos e de mercado permanecem visíveis para revisão do criador.</p>
      </SettingsModule>

      <SettingsModule title="Validação automática" description="O painel verifica dados, faixas, referências, recomendações e alcançabilidade dos resultados.">
        <div className={styles.validationSummary}>
          <span><strong>{errors.length}</strong> erros</span>
          <span><strong>{warnings.length}</strong> alertas</span>
          <span><strong>{balance?.totalPaths.toLocaleString('pt-BR') ?? '—'}</strong> caminhos válidos</span>
          <span><strong>{balance?.recommendedStars?.toFixed(1) ?? '—'}★</strong> caminho recomendado</span>
        </div>
        <div className={styles.issueList}>
          {!issues.length ? <div className={styles.okIssue}>Configuração válida: todas as faixas são alcançáveis e o caminho recomendado está calibrado.</div> : null}
          {issues.map((issue, index) => (
            <div key={`${issue.level}-${index}`} className={issue.level === 'error' ? styles.errorIssue : styles.warningIssue}>{issue.message}</div>
          ))}
        </div>
        {balance ? (
          <div className={styles.balanceGrid}>
            {config.scenario.resultBands.map((band) => (
              <article key={band.id}>
                <small>{band.minScore}–{band.maxScore} pontos</small>
                <strong>{band.title}</strong>
                <span>{(balance.bandCounts[band.id] ?? 0).toLocaleString('pt-BR')} caminhos</span>
              </article>
            ))}
          </div>
        ) : null}
      </SettingsModule>
    </>
  );
}

interface SharedProps {
  config: AppConfig;
  updateConfig: (updater: (current: AppConfig) => AppConfig) => void;
}

function SettingsModule({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className={styles.module}><div className={styles.moduleHeader}><span className="eyebrow">Configuração</span><h1>{title}</h1><p>{description}</p></div>{children}</section>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`${styles.field} ${wide ? styles.wide : ''}`}><span>{label}</span>{children}</label>;
}

function patchBrand(updateConfig: SharedProps['updateConfig'], field: keyof AppConfig['brand'], value: string) {
  updateConfig((current) => ({ ...current, brand: { ...current.brand, [field]: value } }));
}

function patchCar(updateConfig: SharedProps['updateConfig'], index: number, car: AppConfig['scenario']['cars'][number]) {
  updateConfig((current) => {
    const cars = [...current.scenario.cars]; cars[index] = car;
    return { ...current, scenario: { ...current.scenario, cars } };
  });
}

function splitFlags(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function metricName(metric: MetricKey): string {
  const names: Record<MetricKey, string> = { cash: 'Caixa', reputation: 'Reputação', quality: 'Qualidade', capacity: 'Capacidade', risk: 'Risco', customers: 'Clientes', fatigue: 'Carga/Fadiga' };
  return names[metric];
}
