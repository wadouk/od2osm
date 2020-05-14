# od2osm

## Les solutions existantes

### JOSM

TODO

### Osmose

TODO

## Problèmes

 - les jeux de données sont trop gros pour être traité seul (exclu josm)
 - une analyse osmose reste du code python ce qui peut effrayé (ce qui m'effraie)
 - je ne sais pas faire les rapprochements osmose pour faire 
    - de la création de point
    - modification des tags 
    - (lacune de doc ? yaka aider et fainénatise, rejet du python)
- les solutions existantes me paraissent tellement compliqué

## Sujet

Aider un contributeur OSM à intégrer de la donnée en opendata. 

Appli web pour que le travail soit partagé entre les contributeurs.

L'idée est de passer sur chaque point, de faire une requête overpass pour trouver un point "proche" et "similaire" et de créer ou fusionner les informations.

L'outil stock les points déjà rapprochés pour ne pas les re proposer par défaut.

# La solution

 1. Faire un traitement avec l'outil de son choix pour convertir les données en GeoJSON OSMisé (properties ne sont que des tags osm
 2. Uploader le fichier
 3. La communauté peut traiter les points pour ajouter / modifier ceux existants dans OSM
 
 # Limites
 
 Pour les besoins de test (cohérence des environnement OSM) la requête de comparaison des points existant passe par `maps?bounds` d'OSM plutôt qu'overpass, beaucoup de données envoyés et beaucoup de filtrage sur le client, risque sur le quota

TODO

# Only for dev
## CLI Commands

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# test the production build locally
npm run serve

# run tests with jest and preact-render-spy 
npm run test
```

For detailed explanation on how things work, checkout the [CLI Readme](https://github.com/developit/preact-cli/blob/master/README.md).
