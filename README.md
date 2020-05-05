# od2osm

## Sujet

Aider un contributeur OSM à intégrer de la donnée en opendata. 

Appli web pour que le travail soit partagé entre les contributeurs.

L'idée est de passer sur chaque point, de faire une requête overpass pour trouver un point "proche" et "similaire" et de créer ou fusionner les informations.

L'outil stockera les points déjà rapprochés pour ne pas les re proposer par défaut.

![screenshot](https://user-images.githubusercontent.com/787448/81051596-445d8280-8ec2-11ea-979c-91f3e0894706.jpg)

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
