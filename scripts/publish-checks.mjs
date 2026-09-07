const productionEnvironment = (environment) => {
  const next = { ...environment };
  delete next.POSTS_DIR;
  return next;
};

export const runPublicationChecks = (run, environment = process.env) => {
  run('npm', ['run', 'check']);
  run('npm', ['run', 'build', '--', '--force'], { env: productionEnvironment(environment) });
};
