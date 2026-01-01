<section class="login">
  <div class="card">
    <h1>Sign in</h1>
    <p>Googleアカウントでログインします。</p>
    <a class="google" href="/login/start">Googleでログイン</a>
  </div>
</section>

<style>
  .login {
    min-height: calc(100dvh - 60px);
    display: grid;
    place-items: center;
  }

  .card {
    display: grid;
    gap: 12px;
    padding: 32px;
    background: #fffdf8;
    border: 1px solid #e5e0d9;
    border-radius: 16px;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }

  h1 {
    font-size: 24px;
    font-weight: 600;
  }

  p {
    color: #6b645c;
    font-size: 14px;
  }

  .google {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border-radius: 999px;
    background: #1d1d1d;
    color: #fff;
    text-decoration: none;
    font-weight: 600;
  }
</style>
