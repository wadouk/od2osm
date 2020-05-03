import { h } from 'preact';
import { Link } from 'preact-router/match';
import style from './style.css';
import LoginStatus from '../LoginStatus';

const Header = () => (
	<header className={style.header}>
		<h1><Link activeClassName={style.active} href="/">OpenData to OpenStreetMap</Link></h1>
    <div className={style.spacer}/>
    <nav>
      <Link activeClassName={style.active} href={"/quests"}>Quests</Link>
    </nav>
    <Link activeClassName={style.active} href="/authenticated"><LoginStatus/></Link>
	</header>
);

export default Header;
