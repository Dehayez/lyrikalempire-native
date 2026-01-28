import React from 'react';
import './PageContainer.scss';

const PageContainer = ({ title, subtitle, actions, children, className = '' }) => {
    const containerClassName = ['page-container', className].filter(Boolean).join(' ');
    const hasHeader = title || subtitle || actions;

    return (
        <section className={containerClassName}>
            <div className="page-container__inner">
                {hasHeader && (
                    <div className="page-container__header">
                        <div className="page-container__title-group">
                            {title && <h1 className="page-container__title">{title}</h1>}
                            {subtitle && <p className="page-container__subtitle">{subtitle}</p>}
                        </div>
                        {actions && <div className="page-container__actions">{actions}</div>}
                    </div>
                )}
                <div className="page-container__body">{children}</div>
            </div>
        </section>
    );
};

export default PageContainer;
