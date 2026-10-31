import type { AppProps } from "next/app";
import Head from "next/head";
import { Layout } from "../components/Layout";
import type { PageData } from "../lib/types";
import "../../public/css/styles.css";

export default function App({ Component, pageProps }: AppProps<PageData>) {
  return (
    <>
      <Head>
        <title>
          {pageProps.title || "Nanny Events & Caterers"} | Nanny Events &amp;
          Caterers
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Nanny Events & Caterers — Nairobi event catering, traditional Kenyan menus, weddings, dowry ceremonies, corporate functions and food delivery."
        />
      </Head>
      <Layout
        currentUser={pageProps.currentUser || null}
        flash={pageProps.flash || null}
        year={pageProps.year || new Date().getFullYear()}
      >
        <Component {...pageProps} />
      </Layout>
    </>
  );
}
