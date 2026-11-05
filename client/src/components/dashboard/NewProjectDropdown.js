import React from 'react';
import { Button, Icon, MenuButton } from '../kc';

// The page's primary action: "New project", then pick website or document
export default function NewProjectDropdown({ onSelect }) {
  return (
    <MenuButton
      align="right"
      label="New project"
      width={240}
      items={[
        { label: 'Website', icon: 'globe', meta: 'Live URL', onClick: () => onSelect('website') },
        { label: 'Document', icon: 'doc', meta: 'PDF or images', onClick: () => onSelect('document') },
      ]}
      renderTrigger={({ ref, toggle, ...aria }) => (
        <Button ref={ref} variant="primary" icon="plus" onClick={toggle} {...aria}>
          New project
          <Icon name="down" size={14} />
        </Button>
      )}
    />
  );
}
