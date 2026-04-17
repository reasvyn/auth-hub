import { RoleBuilder, defineRoles } from '../builder';

describe('defineRoles() / RoleBuilder', () => {
  it('returns a RoleBuilder instance', () => {
    expect(defineRoles()).toBeInstanceOf(RoleBuilder);
  });

  it('builds an engine with defined roles', () => {
    const engine = defineRoles()
      .role('admin', { permissions: ['*'] })
      .role('user', { permissions: ['profile:read'] })
      .build();

    expect(engine.can('admin').do('anything')).toBe(true);
    expect(engine.can('user').do('profile:read')).toBe(true);
    expect(engine.can('user').do('profile:update')).toBe(false);
  });

  it('supports role inheritance via .role() with inherits', () => {
    const engine = defineRoles()
      .role('editor', { permissions: ['posts:write'], inherits: ['viewer'] })
      .role('viewer', { permissions: ['posts:read'] })
      .build();

    expect(engine.can('editor').do('posts:read')).toBe(true);
    expect(engine.can('editor').do('posts:write')).toBe(true);
    expect(engine.can('viewer').do('posts:write')).toBe(false);
  });

  it('throws when adding a duplicate role name', () => {
    expect(() =>
      defineRoles()
        .role('admin', { permissions: ['*'] })
        .role('admin', { permissions: ['users:read'] }),
    ).toThrow('[auth-rbac] Role "admin" is already defined.');
  });

  it('.extend() adds permissions to an existing role', () => {
    const engine = defineRoles()
      .role('user', { permissions: ['profile:read'] })
      .extend('user', { permissions: ['profile:update'] })
      .build();

    expect(engine.can('user').do('profile:read')).toBe(true);
    expect(engine.can('user').do('profile:update')).toBe(true);
  });

  it('.extend() adds inherits to an existing role', () => {
    const engine = defineRoles()
      .role('user', { permissions: ['profile:read'] })
      .role('viewer', { permissions: ['content:read'] })
      .extend('user', { inherits: ['viewer'] })
      .build();

    expect(engine.can('user').do('content:read')).toBe(true);
  });

  it('.extend() throws when role does not exist', () => {
    expect(() =>
      defineRoles().extend('nonexistent', { permissions: ['x:y'] }),
    ).toThrow('[auth-rbac] Cannot extend unknown role "nonexistent".');
  });

  it('.toConfig() returns a deep clone of the role config', () => {
    const builder = defineRoles().role('admin', { permissions: ['*'] });
    const config = builder.toConfig();
    expect(config.roles).toHaveLength(1);
    expect(config.roles[0].name).toBe('admin');
    // modifying the clone should not affect the builder
    config.roles[0].permissions.push('extra:perm');
    const config2 = builder.toConfig();
    expect(config2.roles[0].permissions).not.toContain('extra:perm');
  });

  it('chains multiple .role() calls fluently', () => {
    const engine = defineRoles()
      .role('r1', { permissions: ['a:read'] })
      .role('r2', { permissions: ['b:read'] })
      .role('r3', { permissions: ['c:read'] })
      .build();

    expect(engine.getRoles()).toHaveLength(3);
    expect(engine.can('r1').do('a:read')).toBe(true);
    expect(engine.can('r3').do('c:read')).toBe(true);
    expect(engine.can('r1').do('c:read')).toBe(false);
  });
});
