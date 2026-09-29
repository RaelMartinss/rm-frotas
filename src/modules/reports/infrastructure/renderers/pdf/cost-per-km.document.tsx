import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { CostPerKmReportResponseDto } from '../../../presentation/dto/cost-per-km-response.dto';
import { ReportRenderContext } from '../../../application/ports/report-renderer.port';
import {
  MIN_KM_FOR_CPK,
  CPK_ALERT_THRESHOLD,
  MIN_VEHICLES_FOR_FLEET_COMPARISON,
} from '../../../domain/policies/cost-per-km.policy';
import {
  formatCurrency,
  formatKm,
  formatPercent,
  formatDate,
  formatDateTime,
} from '../shared/pt-br-formatters';

export interface CostPerKmDocumentProps {
  data: CostPerKmReportResponseDto;
  context: ReportRenderContext;
  filteredPlate?: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 42,
    paddingHorizontal: 36,
    fontFamily: 'Inter',
    fontSize: 8,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },

  // CABEÇALHO (Repete em todas as páginas)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
    marginBottom: 10,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 28,
    height: 28,
    backgroundColor: '#0f172a',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadgeText: {
    color: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 11,
  },
  brandTitle: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 1,
  },
  metaContainer: {
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 7.5,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 1.35,
  },
  metaBold: {
    fontFamily: 'Inter',
    fontWeight: 600,
    color: '#0f172a',
  },
  metaDoc: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 500,
    color: '#2563eb',
  },

  // BARRA DE CONTEXTO
  contextBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 12,
    fontSize: 7.5,
  },
  contextText: {
    color: '#475569',
  },
  contextBold: {
    fontFamily: 'Inter',
    fontWeight: 600,
    color: '#0f172a',
  },

  // CARDS DE KPI
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 7,
    borderTopWidth: 2.5,
    borderTopColor: '#cbd5e1',
  },
  kpiCardAlert: {
    borderTopColor: '#ef4444',
  },
  kpiCardHighlight: {
    borderTopColor: '#2563eb',
  },
  kpiLabel: {
    fontSize: 6.5,
    fontFamily: 'Inter',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  kpiValue: {
    fontSize: 11.5,
    fontFamily: 'JetBrainsMono',
    fontWeight: 700,
    color: '#0f172a',
  },
  kpiDesc: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 2,
  },

  // TABELA
  tableContainer: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  thText: {
    fontSize: 6.5,
    fontFamily: 'Inter',
    fontWeight: 700,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  rowAboveAverage: {
    backgroundColor: '#fff1f2',
  },
  rowEven: {
    backgroundColor: '#fafbfc',
  },

  // LARGURAS DAS COLUNAS (Soma = 100%)
  colVehicle: { width: '24%' },
  colFuel: { width: '12%', textAlign: 'right' },
  colMaint: { width: '12%', textAlign: 'right' },
  colKm: { width: '9%', textAlign: 'right' },
  colCpk: { width: '10%', textAlign: 'right' },
  colVsFleet: { width: '10%', textAlign: 'right' },
  colVsPrev: { width: '11%', textAlign: 'right' },
  colStatus: { width: '12%', textAlign: 'center' },

  // CÉLULAS E ELEMENTOS
  plateContainer: {
    flexDirection: 'column',
    gap: 1,
  },
  plateBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 7,
    fontFamily: 'JetBrainsMono',
    fontWeight: 700,
    alignSelf: 'flex-start',
    color: '#0f172a',
  },
  vehicleModel: {
    fontSize: 6.8,
    color: '#475569',
    marginTop: 1,
  },
  monoText: {
    fontSize: 7.2,
    fontFamily: 'JetBrainsMono',
    fontWeight: 500,
    color: '#0f172a',
  },
  monoBold: {
    fontSize: 7.2,
    fontFamily: 'JetBrainsMono',
    fontWeight: 700,
  },
  cpkAlert: {
    color: '#b91c1c',
  },
  deltaPos: {
    color: '#b91c1c',
    fontFamily: 'JetBrainsMono',
    fontWeight: 600,
  },
  deltaNeg: {
    color: '#15803d',
    fontFamily: 'JetBrainsMono',
    fontWeight: 600,
  },

  // STATUS BADGES
  statusPill: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    fontSize: 6,
    fontFamily: 'Inter',
    fontWeight: 600,
    alignSelf: 'center',
  },
  statusOk: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  statusAbove: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  statusInsufficient: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  statusSubtext: {
    fontSize: 5.5,
    color: '#94a3b8',
    marginTop: 1,
    textAlign: 'center',
  },

  // EMPTY STATE & WARNING BOX
  emptyBox: {
    padding: 24,
    textAlign: 'center',
    backgroundColor: '#fafbfc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 8.5,
    color: '#64748b',
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  warningBoxTitle: {
    fontSize: 7.5,
    fontFamily: 'Inter',
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 2,
  },
  warningBoxText: {
    fontSize: 7,
    color: '#78350f',
    lineHeight: 1.35,
  },

  // LINHA DE TOTAIS
  tableTotalRow: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderTopColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 7.5,
    color: '#0f172a',
  },
  totalSubtext: {
    fontSize: 6,
    color: '#64748b',
    marginTop: 0.5,
  },
  totalMono: {
    fontSize: 7.2,
    fontFamily: 'JetBrainsMono',
    fontWeight: 700,
    color: '#0f172a',
  },
  totalMonoBold: {
    fontSize: 7.2,
    fontFamily: 'JetBrainsMono',
    fontWeight: 700,
    color: '#2563eb',
  },
  totalStatusText: {
    fontSize: 6.5,
    fontFamily: 'Inter',
    fontWeight: 600,
    color: '#475569',
    textAlign: 'center',
  },

  // NOTA METODOLÓGICA
  methodologyNote: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.45,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // RODAPÉ FIXO
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    fontSize: 6.8,
    color: '#94a3b8',
  },
  footerDocId: {
    fontFamily: 'JetBrainsMono',
    fontWeight: 500,
  },
});

export const CostPerKmDocument: React.FC<CostPerKmDocumentProps> = ({
  data,
  context,
  filteredPlate,
}) => {
  const shortDocId = context.exportId.slice(0, 8).toUpperCase();
  const noEligibleVehicles =
    data.rows.length > 0 && data.summary.eligibleVehicles === 0;

  const mapReasonText = (reason: string | null): string => {
    switch (reason) {
      case 'LOW_KM':
        return `Menos de ${MIN_KM_FOR_CPK} km`;
      case 'NO_READINGS':
        return 'Sem leituras';
      case 'KM_REGRESSION':
        return 'Odômetro inconsistente';
      case 'KM_OUTLIER':
        return 'Km incompatível com o período';
      default:
        return 'Dados insuficientes';
    }
  };

  return (
    <Document
      title={`Custo por KM — ${data.period.from} a ${data.period.to}`}
      author="RM Frotas"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* CABEÇALHO FIXO EM TODAS AS PÁGINAS */}
        <View style={styles.header} fixed>
          <View style={styles.brandContainer}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>RM</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>RM FROTAS</Text>
              <Text style={styles.brandSubtitle}>Relatório de Custo Operacional por KM</Text>
            </View>
          </View>

          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>
              Cliente: <Text style={styles.metaBold}>{context.clientName}</Text>
            </Text>
            <Text style={styles.metaText}>
              Período: <Text style={styles.metaBold}>{formatDate(data.period.from)} a {formatDate(data.period.to)}</Text>
            </Text>
            <Text style={styles.metaText}>
              Emitido em: {formatDateTime(context.generatedAt)} • Por: {context.generatedByName}
            </Text>
            <Text style={styles.metaText}>
              Documento: <Text style={styles.metaDoc}>DOC-{shortDocId}</Text>
            </Text>
          </View>
        </View>

        {/* BARRA DE CONTEXTO (Topo da primeira página) */}
        <View style={styles.contextBar}>
          <Text style={styles.contextText}>
            Filtro de Veículo: <Text style={styles.contextBold}>{filteredPlate ? `Placa ${filteredPlate}` : 'Todos os veículos da frota'}</Text>
          </Text>
          <Text style={styles.contextText}>
            Comparação com período anterior: <Text style={styles.contextBold}>{formatDate(data.period.previousFrom)} a {formatDate(data.period.previousTo)}</Text>
          </Text>
        </View>

        {/* CARDS DE KPI (4 CARDS) */}
        <View style={styles.kpiRow}>
          {/* Card 1: Custo Total */}
          <View style={[styles.kpiCard, styles.kpiCardHighlight]}>
            <Text style={styles.kpiLabel}>Custo Total da Frota</Text>
            <Text style={styles.kpiValue}>{formatCurrency(data.summary.totalCost)}</Text>
            <Text style={styles.kpiDesc}>
              Combustível {formatCurrency(data.summary.totalFuelCost)} + Manutenção {formatCurrency(data.summary.totalMaintenanceCost)}
            </Text>
          </View>

          {/* Card 2: CPK da Frota */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>CPK da Frota</Text>
            <Text style={styles.kpiValue}>
              {data.summary.fleetCpk ? `${formatCurrency(data.summary.fleetCpk)}/km` : '—'}
            </Text>
            <Text style={styles.kpiDesc}>
              {data.summary.fleetComparisonAvailable
                ? 'Média ponderada da frota'
                : `Comparação indisponível: exige ao menos ${MIN_VEHICLES_FOR_FLEET_COMPARISON} veículos com dados`}
            </Text>
          </View>

          {/* Card 3: Km Rodados */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Km Rodados no Período</Text>
            <Text style={styles.kpiValue}>{formatKm(data.summary.eligibleKm)}</Text>
            <Text style={styles.kpiDesc}>
              {data.summary.eligibleVehicles} veículos com dados suficientes
            </Text>
          </View>

          {/* Card 4: Veículos Acima da Média */}
          <View
            style={[
              styles.kpiCard,
              data.summary.aboveAverageCount > 0 && data.summary.fleetComparisonAvailable
                ? styles.kpiCardAlert
                : {},
            ]}
          >
            <Text style={styles.kpiLabel}>Veículos Acima da Média (+{Math.round(CPK_ALERT_THRESHOLD * 100)}%)</Text>
            <Text style={styles.kpiValue}>
              {data.summary.fleetComparisonAvailable
                ? String(data.summary.aboveAverageCount)
                : 'n/d'}
            </Text>
            <Text style={styles.kpiDesc}>
              {data.summary.fleetComparisonAvailable
                ? data.summary.aboveAverageCount > 0
                  ? `CPK acima de +${Math.round(CPK_ALERT_THRESHOLD * 100)}% da media da frota`
                  : 'Toda a frota dentro do parâmetro'
                : `Exige ao menos ${MIN_VEHICLES_FOR_FLEET_COMPARISON} veículos elegíveis`}
            </Text>
          </View>
        </View>

        {/* AVISO QUANDO NENHUM VEÍCULO TEM DADOS SUFICIENTES */}
        {noEligibleVehicles && (
          <View style={styles.warningBox}>
            <Text style={styles.warningBoxTitle}>Aviso de Dados Insuficientes no Período</Text>
            <Text style={styles.warningBoxText}>
              Nenhum veículo atingiu os critérios mínimos de cálculo no período ({MIN_KM_FOR_CPK} km rodados com odômetro consistente). Verifique se há abastecimentos e leituras de odômetro registradas no período para cálculo de CPK.
            </Text>
          </View>
        )}

        {/* TABELA DE VEÍCULOS */}
        <View style={styles.tableContainer}>
          {/* Cabeçalho da Tabela (Fixed para repetir nas páginas seguintes) */}
          <View style={styles.tableHeader} fixed>
            <View style={styles.colVehicle}><Text style={styles.thText}>Veículo</Text></View>
            <View style={styles.colFuel}><Text style={styles.thText}>Combustível</Text></View>
            <View style={styles.colMaint}><Text style={styles.thText}>Manutenção</Text></View>
            <View style={styles.colKm}><Text style={styles.thText}>Km Rodados</Text></View>
            <View style={styles.colCpk}><Text style={styles.thText}>CPK (R$/km)</Text></View>
            <View style={styles.colVsFleet}><Text style={styles.thText}>vs Frota</Text></View>
            <View style={styles.colVsPrev}><Text style={styles.thText}>vs Anterior</Text></View>
            <View style={styles.colStatus}><Text style={styles.thText}>Status</Text></View>
          </View>

          {/* Linhas da Tabela */}
          {data.rows.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Sem dados de custos ou movimentação no período selecionado.</Text>
            </View>
          ) : (
            <>
              {data.rows.map((row, index) => {
                const isAbove = row.status === 'ABOVE_AVERAGE';
                const isEven = index % 2 === 1;

                return (
                  <View
                    key={row.vehicleId}
                    style={[
                      styles.tableRow,
                      isAbove ? styles.rowAboveAverage : isEven ? styles.rowEven : {},
                    ]}
                    wrap={false}
                  >
                    {/* Veículo (Placa + Modelo/Ano) */}
                    <View style={styles.colVehicle}>
                      <View style={styles.plateContainer}>
                        <Text style={styles.plateBadge}>{row.plate}</Text>
                        <Text style={styles.vehicleModel}>{row.model} ({row.year})</Text>
                      </View>
                    </View>

                    {/* Combustível */}
                    <View style={styles.colFuel}>
                      <Text style={styles.monoText}>{formatCurrency(row.fuelCost)}</Text>
                    </View>

                    {/* Manutenção */}
                    <View style={styles.colMaint}>
                      <Text style={styles.monoText}>{formatCurrency(row.maintenanceCost)}</Text>
                    </View>

                    {/* Km Rodados */}
                    <View style={styles.colKm}>
                      <Text style={styles.monoText}>{formatKm(row.km)}</Text>
                    </View>

                    {/* CPK */}
                    <View style={styles.colCpk}>
                      <Text
                        style={[
                          styles.monoBold,
                          isAbove ? styles.cpkAlert : {},
                        ]}
                      >
                        {row.cpk !== null ? formatCurrency(row.cpk) : '—'}
                      </Text>
                    </View>

                    {/* vs Frota */}
                    <View style={styles.colVsFleet}>
                      <Text
                        style={[
                          styles.monoText,
                          row.deltaVsFleetPercent !== null
                            ? row.deltaVsFleetPercent > 0
                              ? styles.deltaPos
                              : styles.deltaNeg
                            : {},
                        ]}
                      >
                        {formatPercent(row.deltaVsFleetPercent)}
                      </Text>
                    </View>

                    {/* vs Anterior */}
                    <View style={styles.colVsPrev}>
                      <Text
                        style={[
                          styles.monoText,
                          row.deltaVsPreviousPercent !== null
                            ? row.deltaVsPreviousPercent > 0
                              ? styles.deltaPos
                              : styles.deltaNeg
                            : {},
                        ]}
                      >
                        {formatPercent(row.deltaVsPreviousPercent)}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View style={styles.colStatus}>
                      {row.status === 'OK' && (
                        <Text style={[styles.statusPill, styles.statusOk]}>Normal</Text>
                      )}
                      {row.status === 'ABOVE_AVERAGE' && (
                        <Text style={[styles.statusPill, styles.statusAbove]}>Acima da média</Text>
                      )}
                      {row.status === 'INSUFFICIENT_DATA' && (
                        <View>
                          <Text style={[styles.statusPill, styles.statusInsufficient]}>Insuficiente</Text>
                          <Text style={styles.statusSubtext}>{mapReasonText(row.insufficientReason)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* BLOCO DE TOTAIS (3 linhas) */}
              {/* Linha 1: Elegíveis */}
              <View style={[styles.tableTotalRow, { backgroundColor: '#f0fdf4' }]} wrap={false}>
                <View style={styles.colVehicle}>
                  <Text style={styles.totalLabel}>Elegíveis</Text>
                  <Text style={styles.totalSubtext}>{data.summary.eligible.vehicles} veículos</Text>
                </View>

                <View style={styles.colFuel}>
                  <Text style={styles.totalMono}>{formatCurrency(data.summary.eligible.fuelCost)}</Text>
                </View>

                <View style={styles.colMaint}>
                  <Text style={styles.totalMono}>{formatCurrency(data.summary.eligible.maintenanceCost)}</Text>
                </View>

                <View style={styles.colKm}>
                  <Text style={styles.totalMono}>{formatKm(data.summary.eligible.km)}</Text>
                </View>

                <View style={styles.colCpk}>
                  <Text style={styles.totalMonoBold}>
                    {data.summary.eligible.cpk ? formatCurrency(data.summary.eligible.cpk) : '—'}
                  </Text>
                </View>

                <View style={styles.colVsFleet}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colVsPrev}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colStatus}>
                  <Text style={styles.totalStatusText}>—</Text>
                </View>
              </View>

              {/* Linha 2: Sem dados suficientes */}
              <View style={[styles.tableTotalRow, { backgroundColor: '#f8fafc' }]} wrap={false}>
                <View style={styles.colVehicle}>
                  <Text style={styles.totalLabel}>Sem dados suficientes</Text>
                  <Text style={styles.totalSubtext}>{data.summary.insufficient.vehicles} veículos</Text>
                </View>

                <View style={styles.colFuel}>
                  <Text style={styles.totalMono}>{formatCurrency(data.summary.insufficient.fuelCost)}</Text>
                </View>

                <View style={styles.colMaint}>
                  <Text style={styles.totalMono}>{formatCurrency(data.summary.insufficient.maintenanceCost)}</Text>
                </View>

                <View style={styles.colKm}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colCpk}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colVsFleet}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colVsPrev}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colStatus}>
                  <Text style={styles.totalStatusText}>—</Text>
                </View>
              </View>

              {/* Linha 3: Total Geral */}
              <View style={styles.tableTotalRow} wrap={false}>
                <View style={styles.colVehicle}>
                  <Text style={styles.totalLabel}>Totais da Frota</Text>
                  <Text style={styles.totalSubtext}>{data.rows.length} veículos computados</Text>
                </View>

                <View style={styles.colFuel}>
                  <Text style={styles.totalMono}>{formatCurrency(data.summary.totalFuelCost)}</Text>
                </View>

                <View style={styles.colMaint}>
                  <Text style={styles.totalMono}>{formatCurrency(data.summary.totalMaintenanceCost)}</Text>
                </View>

                <View style={styles.colKm}>
                  <Text style={styles.totalMono}>{formatKm(data.summary.eligibleKm)}</Text>
                </View>

                <View style={styles.colCpk}>
                  <Text style={styles.totalMonoBold}>
                    {data.summary.fleetCpk ? formatCurrency(data.summary.fleetCpk) : '—'}
                  </Text>
                </View>

                <View style={styles.colVsFleet}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colVsPrev}>
                  <Text style={styles.monoText}>—</Text>
                </View>

                <View style={styles.colStatus}>
                  <Text style={styles.totalStatusText}>
                    {data.summary.eligibleVehicles} elegíveis
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* NOTA METODOLÓGICA */}
        <Text style={styles.methodologyNote}>
          Nota metodológica: CPK = (combustível + manutenção) ÷ km rodados. Média da frota ponderada, considerando apenas veículos com dados suficientes ({MIN_KM_FOR_CPK} km mínimos). Alerta emitido quando o CPK excede a média da frota em mais de {Math.round(CPK_ALERT_THRESHOLD * 100)}%. Períodos curtos podem distorcer o CPK em razão de manutenções pontuais.
        </Text>

        {/* RODAPÉ FIXO (Repete em todas as páginas com numeração dinâmica) */}
        <View style={styles.footer} fixed>
          <Text>
            RM Frotas • Custo por KM • Doc. <Text style={styles.footerDocId}>DOC-{shortDocId}</Text>
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};
