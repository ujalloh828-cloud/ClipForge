# ClipForge

Prototype responsive d’une application de montage vidéo pour navigateur, conçue pour bureau et mobile.

## Lancer l’application

Depuis ce dossier, exécutez :

```powershell
python -m http.server 8080
```

Puis ouvrez `http://localhost:8080` dans votre navigateur. Vous pouvez également ouvrir `index.html` directement pour examiner l’interface.

## Fonctionnalités incluses

- Éditeur avec timeline multipiste, import local, titres, pistes supplémentaires et aperçu vidéo.
- Studio IA : génération de propositions de visuels, plans et audio simulée depuis un script, avec insertion dans la timeline.
- Abonnements : mensuel (5 $ / 700 crédits IA), annuel (48 $ / 4 $ par mois) et Illimité, avec texte de remboursement sous deux jours.
- Administration locale des tarifs : les changements se répercutent immédiatement dans l’écran Premium et sont conservés dans le navigateur.
- Vue projets, export configuré et interface mobile responsive.

## Avant une mise en production

Cette version est un prototype frontal : les paiements, générations IA et exports vidéo sont simulés localement. Il faut connecter un fournisseur de paiement, un stockage sécurisé, une authentification, un moteur de rendu vidéo et des services de génération IA avant publication.
