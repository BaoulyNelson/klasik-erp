import React from 'react';
import { DictionnaireTerminologie } from '../../configuration/terminologie';
import { formater_date_fr, formater_montant } from '../../services/service_donnees';
import {
  Apprenant,
  CodeDevise,
  ConfigurationEtablissement,
  EcheancePaiement,
  InscriptionApprenant,
  UniteAcademique,
} from '../../modeles/erp';
import {
  construire_echeancier_defaut,
  obtenir_comptes_bancaires_defaut_pays,
} from '../../utilitaires/echeancier';
import { CodeQrSvg } from './CodeQrSvg';
import { LogoEtablissement } from './LogoEtablissement';

export function declencher_impression_ciblee() {
  document.body.classList.add('printing-document-modal');
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-document-modal');
    }, 300);
  }, 60);
}

interface ProprietesFicheInscriptionImprimable {
  etablissement: ConfigurationEtablissement;
  terminologie: DictionnaireTerminologie;
  devise: CodeDevise;
  format: 'a4' | '80mm';
  apprenant: Apprenant | null; // null => Modèle vierge à remplir à la main
  unite?: UniteAcademique;
  inscription?: InscriptionApprenant;
}

export const FicheInscriptionImprimable: React.FC<ProprietesFicheInscriptionImprimable> = ({
  etablissement,
  terminologie,
  devise,
  format,
  apprenant,
  unite,
  inscription,
}) => {
  const est_vierge = !apprenant;
  const comptes_bancaires =
    etablissement.comptes_bancaires && etablissement.comptes_bancaires.length > 0
      ? etablissement.comptes_bancaires
      : obtenir_comptes_bancaires_defaut_pays(
          etablissement.code_pays,
          etablissement.nom_court,
          etablissement.devise_defaut
        );
  const compte_actif = comptes_bancaires.find((b) => b.actif) ?? comptes_bancaires[0];

  const echeancier: EcheancePaiement[] = apprenant
    ? apprenant.echeancier && apprenant.echeancier.length > 0
      ? apprenant.echeancier
      : construire_echeancier_defaut(
          apprenant.total_du_htg,
          apprenant.total_paye_htg,
          apprenant.date_inscription,
          unite?.frais_inscription_htg
        )
    : [];

  const valeur_qr = apprenant
    ? `${etablissement.code}|INSCR|${apprenant.matricule}|${apprenant.nom}`
    : `${etablissement.code}|FICHE-VIERGE|${etablissement.annee_academique}`;

  if (format === '80mm') {
    return (
      <div className="printable-document-root">
        <div className="ticket-80mm max-w-[330px] mx-auto bg-white border border-slate-300 shadow-sm p-5 font-mono text-[11.5px] text-slate-900 leading-relaxed">
          <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
            {etablissement.url_logo && (
              <div className="flex justify-center pb-1">
                <img
                  src={etablissement.url_logo}
                  alt={`Logo ${etablissement.nom}`}
                  className="h-9 w-9 object-contain"
                />
              </div>
            )}
            <div className="font-bold text-sm uppercase">{etablissement.nom_court}</div>
            <div className="text-[10px] text-slate-600">{etablissement.nom}</div>
            <div className="text-[10px] text-slate-500">
              {etablissement.adresse} · {etablissement.telephone}
            </div>
            <div className="pt-1 font-bold uppercase tracking-wider text-xs">
              {est_vierge ? 'FICHE D’INSCRIPTION (VIERGE)' : 'TICKET D’INSCRIPTION'}
            </div>
            <div className="text-[10px] text-slate-500">
              Année : {etablissement.annee_academique} · {etablissement.libelle_periode_courante}
            </div>
          </div>

          <div className="py-3 border-b border-dashed border-slate-400 space-y-1.5">
            {inscription && (
              <div className="flex justify-between">
                <span className="text-slate-500">N° Inscription:</span>
                <span className="font-bold">{inscription.numero_inscription}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Matricule:</span>
              <span className="font-bold">{apprenant?.matricule ?? '__________________'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{terminologie.apprenant_singulier}:</span>
              <span className="font-bold text-right">
                {apprenant ? `${apprenant.prenom} ${apprenant.nom}` : '__________________'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{terminologie.unite_singulier}:</span>
              <span className="text-right">
                {unite?.nom ?? inscription?.libelle_niveau ?? apprenant?.libelle_niveau ?? '__________________'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Téléphone:</span>
              <span>{apprenant?.telephone ?? '__________________'}</span>
            </div>
            {apprenant?.courriel && (
              <div className="flex justify-between">
                <span className="text-slate-500">Courriel:</span>
                <span className="text-right">{apprenant.courriel}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>
                {inscription
                  ? formater_date_fr(inscription.date_inscription)
                  : apprenant
                    ? formater_date_fr(apprenant.date_inscription)
                    : '____ / ____ / 202_'}
              </span>
            </div>
            {inscription && (
              <div className="flex justify-between">
                <span className="text-slate-500">Statut dossier:</span>
                <span className="font-bold">
                  {inscription.type_inscription} · {inscription.statut_inscription}
                </span>
              </div>
            )}
          </div>

          {apprenant && (
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Total Net Dû:</span>
                <span className="font-bold">
                  {formater_montant(
                    apprenant.total_du_htg,
                    devise,
                    etablissement.taux_change_usd
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Déjà Payé:</span>
                <span className="font-bold">
                  {formater_montant(
                    apprenant.total_paye_htg,
                    devise,
                    etablissement.taux_change_usd
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-dotted border-slate-300">
                <span className="font-bold">SOLDE RESTANT:</span>
                <span className="font-bold">
                  {formater_montant(
                    Math.max(0, apprenant.total_du_htg - apprenant.total_paye_htg),
                    devise,
                    etablissement.taux_change_usd
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="pt-3 flex flex-col items-center text-center gap-2">
            <CodeQrSvg valeur={valeur_qr} taille={78} />
            <div className="text-[10px] text-slate-500">
              Sceau: {etablissement.code_sceau} · {etablissement.autorite_tutelle}
            </div>
            <div className="text-[10px] text-slate-400">
              Conserver ce ticket comme preuve d’enregistrement.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format A4 officiel (rempli ou vierge)
  return (
    <div className="printable-document-root">
      <div className="print-sheet-a4 rounded-xl border-2 border-slate-300 bg-white text-slate-900 p-6 sm:p-8 space-y-5 text-xs">
        {/* En-tête officiel */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <LogoEtablissement
              type={etablissement.type}
              code={etablissement.code}
              url_logo={etablissement.url_logo}
              nom={etablissement.nom}
              taille="grand"
            />
            <div>
              <div className="text-base font-display font-bold text-slate-900">
                {etablissement.nom}
              </div>
              <div className="text-slate-600">{etablissement.devise_etablissement}</div>
              <div className="text-slate-500 mt-0.5">
                {etablissement.adresse} · {etablissement.ville} ({etablissement.nom_pays})
              </div>
              <div className="text-slate-500 font-mono">
                {etablissement.telephone} · {etablissement.courriel} · Tutelle :{' '}
                {etablissement.autorite_tutelle}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <CodeQrSvg valeur={valeur_qr} taille={72} />
            <span className="font-mono text-[10px] text-slate-500">
              {apprenant?.matricule ?? 'MODÈLE VIERGE'}
            </span>
          </div>
        </div>

        {/* Titre */}
        <div className="text-center py-1">
          <h3 className="text-base font-display font-bold uppercase tracking-wider text-slate-900">
            Fiche Officielle d’Inscription — {terminologie.libelle_type_complet}
          </h3>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            Année académique : {inscription?.annee_academique ?? etablissement.annee_academique} ·
            Période : {inscription?.libelle_periode ?? etablissement.libelle_periode_courante}
            {inscription && (
              <>
                {' '}
                · N° {inscription.numero_inscription} ({inscription.statut_inscription})
              </>
            )}
          </div>
        </div>

        {/* Section 1 : Identité */}
        <div className="rounded-lg border border-slate-200 p-4 space-y-2.5">
          <div className="font-display font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
            1. Identité du / de la {terminologie.apprenant_singulier}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-slate-500">Matricule attribué</div>
              <div className="font-mono font-bold text-sm">
                {apprenant?.matricule ?? '______________________'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Nom de famille</div>
              <div className="font-semibold">
                {apprenant?.nom ?? '______________________'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Prénom(s)</div>
              <div className="font-semibold">
                {apprenant?.prenom ?? '______________________'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Sexe</div>
              <div>
                {apprenant
                  ? apprenant.sexe === 'F'
                    ? 'Féminin (F)'
                    : 'Masculin (M)'
                  : '[ ] F   [ ] M'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Date & Lieu de naissance</div>
              <div>
                {apprenant
                  ? `${formater_date_fr(apprenant.date_naissance)} à ${apprenant.lieu_naissance}`
                  : '____/____/____ à ____________'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Nationalité</div>
              <div>{apprenant?.nationalite ?? '______________________'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Téléphone</div>
              <div className="font-mono">{apprenant?.telephone ?? '______________________'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Courriel personnel</div>
              <div className="font-mono">{apprenant?.courriel || '______________________'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Mobilité / Visa</div>
              <div>
                {apprenant
                  ? apprenant.mobilite_internationale
                    ? `Oui (${apprenant.reference_visa_passeport || 'Passeport requis'})`
                    : 'Résident / Local'
                  : '[ ] Local  [ ] International'}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <div className="text-[10px] text-slate-500">Adresse complète</div>
              <div>
                {apprenant?.adresse ?? '____________________________________________________'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 : Affectation académique & Tuteurs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <div className="font-display font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
              2. Affectation Académique & Administrative
            </div>
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-500">{terminologie.unite_singulier} : </span>
                <strong>{unite?.nom ?? inscription?.libelle_niveau ?? apprenant?.libelle_niveau ?? '______________________'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Code / Niveau : </span>
                <span className="font-mono">
                  {unite ? `${unite.code} (${unite.niveau_ou_duree})` : apprenant?.libelle_niveau ?? '________________'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Date d’inscription : </span>
                <span className="font-mono">
                  {inscription
                    ? formater_date_fr(inscription.date_inscription)
                    : apprenant
                      ? formater_date_fr(apprenant.date_inscription)
                      : '____ / ____ / 202_'}
                </span>
              </div>
              {(apprenant?.pourcentage_bourse || inscription?.pourcentage_bourse) ? (
                <div>
                  <span className="text-slate-500">Bourse / Réduction accordée : </span>
                  <strong className="font-mono">
                    {inscription?.pourcentage_bourse ?? apprenant?.pourcentage_bourse}%
                  </strong>
                </div>
              ) : null}
              {inscription && (
                <div>
                  <span className="text-slate-500">Type & Statut : </span>
                  <span className="font-mono font-semibold">
                    {inscription.type_inscription} · {inscription.statut_inscription}
                  </span>
                </div>
              )}
              {inscription?.observations && (
                <div>
                  <span className="text-slate-500">Observations : </span>
                  <span>{inscription.observations}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 space-y-2">
            <div className="font-display font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
              3. Responsables / Contacts d’urgence
            </div>
            {apprenant?.tuteurs && apprenant.tuteurs.length > 0 ? (
              <div className="space-y-1.5">
                {apprenant.tuteurs.map((tuteur, indice) => (
                  <div key={indice} className="flex justify-between gap-2">
                    <span>
                      <strong>{tuteur.nom_complet}</strong> ({tuteur.lien_parente})
                    </span>
                    <span className="font-mono">{tuteur.telephone}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-slate-500">
                <div>Nom & Lien : ____________________________________</div>
                <div>Tél. urgence : __________________________________</div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4 : Pièces du dossier */}
        <div className="rounded-lg border border-slate-200 p-4 space-y-2">
          <div className="font-display font-bold text-slate-800 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
            4. Contrôle des Pièces Administratives
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {terminologie.pieces_admission_requises.map((piece) => {
              const est_manquante = apprenant?.pieces_manquantes?.includes(piece);
              const cochee = apprenant ? !est_manquante : false;
              return (
                <div key={piece} className="flex items-center gap-2">
                  <span className="font-mono font-bold">
                    {apprenant ? (cochee ? '[✓]' : '[ ]') : '[ ]'}
                  </span>
                  <span>{piece}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5 : Échéancier financier */}
        <div className="rounded-lg border border-slate-200 p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <span className="font-display font-bold text-slate-800 uppercase text-[11px] tracking-wider">
              5. Échéancier Financier & Paiement
            </span>
            {compte_actif && (
              <span className="text-[10px] font-mono text-slate-500">
                Compte : {compte_actif.nom_banque} ({compte_actif.numero_compte})
              </span>
            )}
          </div>
          {apprenant ? (
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 text-left">Tranche</th>
                  <th className="py-1 text-left">Échéance</th>
                  <th className="py-1 text-right">Montant dû</th>
                  <th className="py-1 text-right">Payé</th>
                  <th className="py-1 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {echeancier.map((tranche) => (
                  <tr key={tranche.id}>
                    <td className="py-1 font-medium">{tranche.libelle}</td>
                    <td className="py-1 font-mono">{formater_date_fr(tranche.date_echeance)}</td>
                    <td className="py-1 text-right font-mono">
                      {formater_montant(
                        tranche.montant_du_htg,
                        devise,
                        etablissement.taux_change_usd
                      )}
                    </td>
                    <td className="py-1 text-right font-mono">
                      {formater_montant(
                        tranche.montant_paye_htg,
                        devise,
                        etablissement.taux_change_usd
                      )}
                    </td>
                    <td className="py-1 text-right font-semibold">{tranche.statut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-slate-500 py-1">
              <div>Inscription : ____________</div>
              <div>1ère Tranche : ____________</div>
              <div>Solde final : ____________</div>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="pt-4 grid grid-cols-2 gap-6 border-t border-slate-200">
          <div>
            <div className="text-[11px] font-semibold">
              Signature du / de la {terminologie.apprenant_singulier} ou Tuteur légal
            </div>
            <div className="h-12 border-b border-dashed border-slate-300 mt-2" />
            <div className="text-[10px] text-slate-400 mt-1">Précédée de « Lu et approuvé »</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold">
              {etablissement.nom_direction} · {etablissement.titre_direction}
            </div>
            <div className="h-12 border-b border-dashed border-slate-300 mt-2" />
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Sceau officiel : {etablissement.code_sceau}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
