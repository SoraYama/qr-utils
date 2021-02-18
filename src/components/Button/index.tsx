import React from 'react';
import { noop } from '../../utils';

import styles from './index.css';

interface ButtonProps {
  text: string;
  onClick: () => void;
}

const Button = (props: ButtonProps) => {
  const { text, onClick = noop } = props;
  return (
    <button className={styles.buttonWrapper} onClick={onClick} type="button">
      <span className={styles.buttonText}>{text}</span>
    </button>
  );
};

export default Button;
