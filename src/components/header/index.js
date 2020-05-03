import { h } from 'preact';
import { Link } from 'preact-router/match';
import style from './style.css';
import LoginStatus from '../LoginStatus';

const Header = () => (
	<header className={style.header}>
		<h1>OpenData to OpenStreetMap</h1>
    <div className={style.spacer}/>
		<nav>
			<Link activeClassName={style.active} href="/">Home</Link>
		</nav>
    <Link activeClassName={style.active} href="/authenticated"><LoginStatus/></Link>
	</header>
);

export default Header;
