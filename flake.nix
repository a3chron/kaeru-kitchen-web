{
  description = "Kaeru's Kitchen Hub - Next.js dev environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = [
          pkgs.nodejs_22
          pkgs.pnpm
        ];

        shellHook = ''
          echo "Kaeru's Kitchen Hub dev shell — Node $(node --version), pnpm $(pnpm --version)"
        '';
      };
    };
}
