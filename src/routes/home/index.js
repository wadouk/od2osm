import { h } from 'preact';
import style from './style';

const Home = () => (
	<div class={style.home}>
		<h1>OpenData vers OpenStreetMap</h1>
		<p>Bienvenue !</p>
    <p>L'idée de cette application est de permettre d'ajouter les données de l'opendata à openstreetmap.</p>
    <p>Pour l'instant un seul jeu de données OpenData est présent.</p>
    <ul>
      <li>Vous pouvez le consulter dans le lien Quests en haut</li>
      <li>Cela vous aménera aux points</li>
      <li>De là vous pourrez le rapprocher des données OSM</li>
      <li>Puis envoyer les rapprochements dans la base OSM</li>
      <li>Vous aurez besoin d'utiliser votre compte OSM pour envoyer la donnée</li>
      <li>Il n'y a pas de compte pour od2osm spécifique</li>
      <li>l'api utilisé est {process.env.PREACT_APP_OSM}</li>
      <li>C'est sur cet environnement que vous devez avoir un compte</li>
      <li>S'il n'y a pas de blocage, l'application utilisera l'API publique d'OSM plus tard</li>
    </ul>
	</div>
);

export default Home;
