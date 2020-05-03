import { h } from 'preact';
import { Link } from 'preact-router/match';
import style from './style.css';
import LoginStatus from '../LoginStatus';

const Header = () => (
	<header className={style.header}>
		<h1>Preact App</h1>
    <div className={style.spacer}/>
		<nav>
			<Link activeClassName={style.active} href="/">Home</Link>
		</nav>
    <LoginStatus/>
	</header>
);

export default Header;
