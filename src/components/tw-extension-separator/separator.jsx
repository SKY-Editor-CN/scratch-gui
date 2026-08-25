import React from 'react';
import styles from './separator.css';

const Separator = ({title}) => {
    if (title) {
        return (
            <div className={styles.separatorWithTitle}>
                <span className={styles.separatorTitle}>{title}</span>
            </div>
        );
    }
    return <hr className={styles.separator} />;
};

export default Separator;
