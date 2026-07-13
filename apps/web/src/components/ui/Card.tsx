import React from 'react';
import '../../styles/tokens.css';
import './card.css';

type CardVariant = 'default' | 'accent' | 'danger' | 'metric';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div' | 'aside';
  variant?: CardVariant;
}

export default function Card({ as: Tag = 'section', variant = 'default', className = '', ...props }: CardProps) {
  return <Tag className={`uiCard uiCard--${variant} ${className}`.trim()} {...props} />;
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`uiCard__header ${props.className || ''}`.trim()} />;
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`uiCard__content ${props.className || ''}`.trim()} />;
}

export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`uiCard__footer ${props.className || ''}`.trim()} />;
}
